import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const priorities = new Set(["critical", "review", "info"]);
const categories = new Set([
  "document_control",
  "technical_consistency",
  "inspection_scope",
  "normative_compliance",
  "completeness",
]);
const outcomes = new Set([
  "routine_normal",
  "reinforced_monitoring",
  "corrective_action",
  "remove_from_service",
]);

const textList = (value: unknown, limit = 8) =>
  (Array.isArray(value) ? value : [])
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, limit);

const sanitizeAnalysis = (raw: Record<string, unknown>) => {
  const score = Number(raw.quality_score);
  const rawFindings = Array.isArray(raw.review_findings) ? raw.review_findings : [];
  const reviewFindings = rawFindings
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      priority: priorities.has(String(item.priority)) ? String(item.priority) : "review",
      category: categories.has(String(item.category)) ? String(item.category) : "technical_consistency",
      evidence: typeof item.evidence === "string" ? item.evidence.trim() : "",
      recommendation: typeof item.recommendation === "string" ? item.recommendation.trim() : "",
    }))
    .filter((item) => item.evidence && item.recommendation)
    .slice(0, 12);

  return {
    quality_score: Number.isFinite(score) ? Math.round(Math.max(0, Math.min(100, score))) : 0,
    review_outcome: outcomes.has(String(raw.review_outcome)) ? raw.review_outcome : "routine_normal",
    strengths: textList(raw.strengths),
    improvements: textList(raw.improvements),
    review_findings: reviewFindings,
    extracted_data: raw.extracted_data && typeof raw.extracted_data === "object" ? raw.extracted_data : {},
    limitations: textList(raw.limitations, 5),
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Autenticação necessária para revisar documentos.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Sessão inválida ou expirada.");

    const body = await req.json();
    const { reportId, fileBase64, fileContent, fileName = "documento", scopeType, client, profileContext } = body;
    let documentContent = "";

    if (reportId) {
      const { data, error } = await supabaseClient.from("inspection_reports").select("*").eq("id", reportId).single();
      if (error) throw error;
      documentContent = JSON.stringify(data.report_data, null, 2);
    } else if (typeof fileContent === "string" && fileContent.trim()) {
      documentContent = fileContent;
    } else if (!fileBase64) {
      throw new Error("Nenhum conteúdo foi recebido para análise.");
    }

    if (fileBase64 && !String(fileName).toLowerCase().endsWith(".pdf")) {
      throw new Error("Para DOCX/XLSX, envie o texto extraído do documento.");
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("Serviço de IA não configurado.");

    const domainRules = `
Você é um revisor técnico conservador de relatórios de inspeção de cabos de aço.
A referência usual é a ISO 4309. Sua função é revisar e aconselhar; nunca alterar o documento nem substituir a decisão do responsável técnico.

REGRAS OBRIGATÓRIAS:
- Baseie cada apontamento em evidência textual ou visual presente no documento. Não invente campos, imagens, assinaturas ou requisitos.
- Não trate uma faixa de diâmetros medidos como divergência por si só. Variação ao longo do cabo é normal; sinalize apenas se houver conflito interno explícito, redução relevante frente ao diâmetro de referência ou critério documentado.
- "Not informed" ou equivalente pode ser uma declaração válida. Não classifique automaticamente como campo vazio.
- Não critique ausência, qualidade ou quantidade de fotos quando as imagens não estiverem acessíveis à análise. Registre isso em limitations.
- Diferencie comprimento total do cabo e extensão efetivamente inspecionada. Inspeção parcial não é automaticamente erro; a conclusão deve deixar o escopo claro.
- Compare número do relatório no nome do arquivo, cabeçalho e conteúdo. Divergência ou aparente duplicidade deve ser destacada em document_control.
- Diferencie diâmetro nominal, diâmetro de referência e diâmetros medidos.
- Verifique contradições entre tabelas, versões em idiomas diferentes, conclusão, severidade e recomendação.
- Não recomende retirada de serviço sem evidência explícita de critério de descarte. Use remove_from_service somente quando o próprio relatório sustentar essa decisão.
- Não transforme um único relatório em padrão permanente e não alegue conformidade integral com a ISO 4309 quando faltarem dados para comprová-la.
- Prioridade critical: contradição ou falha com potencial de mudar a conclusão/decisão. review: requer confirmação humana. info: melhoria documental sem impacto técnico imediato.
- O score mede qualidade e consistência do relatório, não a condição física do cabo.
${typeof profileContext === "string" ? profileContext : ""}`;

    const content: unknown[] = [{
      type: "text",
      text: `Revise o documento ${fileName}. Escopo informado: ${scopeType || "geral"}. Cliente: ${client || "não informado"}.\n\n${documentContent ? `=== CONTEÚDO EXTRAÍDO ===\n${documentContent}\n=== FIM ===` : "Analise o PDF anexado visualmente."}`,
    }];
    if (fileBase64) content.push({ type: "image_url", image_url: { url: `data:application/pdf;base64,${fileBase64}` } });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: domainRules }, { role: "user", content }],
        tools: [{
          type: "function",
          function: {
            name: "review_wire_rope_report",
            description: "Retorna parecer técnico estruturado e fundamentado do relatório.",
            parameters: {
              type: "object",
              properties: {
                quality_score: { type: "number", description: "Qualidade documental de 0 a 100." },
                review_outcome: { type: "string", enum: [...outcomes] },
                strengths: { type: "array", items: { type: "string" } },
                improvements: { type: "array", items: { type: "string" } },
                review_findings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", enum: [...priorities] },
                      category: { type: "string", enum: [...categories] },
                      evidence: { type: "string", description: "Trecho, valor ou localização que sustenta o apontamento." },
                      recommendation: { type: "string", description: "Ação objetiva de revisão ou confirmação." },
                    },
                    required: ["priority", "category", "evidence", "recommendation"],
                    additionalProperties: false,
                  },
                },
                extracted_data: {
                  type: "object",
                  properties: {
                    report_number: { type: "string" }, jbr: { type: "string" },
                    client: { type: "string" }, vessel_or_site: { type: "string" },
                    application: { type: "string" }, nominal_diameter: { type: "string" },
                    reference_diameter: { type: "string" }, measured_min: { type: "string" },
                    measured_max: { type: "string" }, total_length: { type: "string" },
                    inspected_length: { type: "string" }, standard: { type: "string" },
                    conclusion: { type: "string" },
                  },
                  additionalProperties: false,
                },
                limitations: { type: "array", items: { type: "string" } },
              },
              required: ["quality_score", "review_outcome", "strengths", "improvements", "review_findings", "extracted_data", "limitations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "review_wire_rope_report" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI gateway failure", aiResponse.status);
      throw new Error(`A revisão por IA falhou (${aiResponse.status}).`);
    }
    const aiData = await aiResponse.json();
    const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("A IA não retornou um parecer estruturado.");
    const analysis = sanitizeAnalysis(JSON.parse(args));

    const { data: knowledge, error: knowledgeError } = await adminClient.from("report_knowledge").insert({
      report_id: reportId || null,
      uploaded_file_path: fileName,
      scope_type: scopeType || "general",
      client: client || null,
      extracted_data: { ...analysis.extracted_data, review_outcome: analysis.review_outcome, review_findings: analysis.review_findings, limitations: analysis.limitations },
      quality_score: analysis.quality_score,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      created_by: user.id,
    }).select().single();
    if (knowledgeError) console.error("Could not persist review knowledge", knowledgeError.code);

    const { data: history } = await supabaseClient.from("report_knowledge").select("quality_score").eq("scope_type", scopeType || "general");
    const validScores = (history || []).map((item) => Number(item.quality_score)).filter(Number.isFinite);
    const average = validScores.length ? Math.round(validScores.reduce((sum, value) => sum + value, 0) / validScores.length) : null;

    return new Response(JSON.stringify({ success: true, analysis: {
      ...analysis,
      knowledge_id: knowledge?.id,
      comparison: { your_score: analysis.quality_score, average_score: average, total_reports_analyzed: validScores.length },
    } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido na revisão.";
    console.error("analyze-report failed", message);
    return new Response(JSON.stringify({ error: message }), {
      status: message.includes("Autenticação") || message.includes("Sessão") ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
