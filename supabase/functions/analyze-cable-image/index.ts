import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  damageTypes: Array<{
    type: string;
    severity: number;
    location: string;
    description: string;
  }>;
  overallSeverity: number;
  overallAssessment: string;
  recommendations: string[];
  suggestedAction: 'continue' | 'monitor' | 'replace';
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Imagem não fornecida');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log('Enviando imagem para análise com tool calling...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `Você é um inspetor técnico especializado em cabos de aço conforme ISO 4309.
Analise imagens de cabos de aço e identifique TODOS os danos visíveis com máxima atenção aos detalhes.

⚠️ ATENÇÃO CRÍTICA PARA ARAMES ROMPIDOS:
Arames rompidos são o dano mais CRÍTICO para segurança. Examine a imagem meticulosamente procurando por:
- Pontas de arame salientes ou protuberantes da superfície do cabo
- Fios soltos, desfiados ou separados do corpo da perna
- Gaps, lacunas ou espaços vazios entre os arames da camada externa
- Extremidades de arame visíveis (cortadas, quebradas ou fraturadas)
- Arames que se destacam da estrutura helicoidal normal
- Irregularidades na continuidade dos arames externos
- Arames dobrados para fora ou em ângulos anormais
- Fragmentos de arame soltos ou semi-destacados

CRITÉRIOS ISO 4309 PARA ARAMES ROMPIDOS:
- SE houver QUALQUER indício de arames rompidos: severidade mínima de 60%
- 1-2 arames rompidos visíveis: severidade 60-70%, ação "monitor"
- 3-5 arames rompidos: severidade 70-85%, ação "replace"
- 6+ arames rompidos em 6d (6x diâmetro): severidade 90-100%, ação "replace" IMEDIATA
- Múltiplos arames rompidos concentrados: severidade 85-100%, ação "replace"

IMPORTANTE: SEJA CONSERVADOR - se houver QUALQUER dúvida sobre arames rompidos, assuma que existem. É preferível um falso positivo a ignorar um dano real que pode causar acidentes.

Use a função report_cable_analysis para retornar sua análise.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta imagem de cabo de aço com MÁXIMA ATENÇÃO aos arames rompidos. Examine cada parte visível do cabo procurando por pontas salientes, fios soltos, gaps ou qualquer irregularidade. Use a função report_cable_analysis para retornar sua análise completa."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_cable_analysis",
              description: "Reporta a análise completa de danos do cabo de aço inspecionado",
              parameters: {
                type: "object",
                properties: {
                  damageTypes: {
                    type: "array",
                    description: "Lista de tipos de danos identificados no cabo",
                    items: {
                      type: "object",
                      properties: {
                        type: { 
                          type: "string", 
                          description: "Tipo do dano (ex: Arames rompidos, Corrosão, Abrasão, Deformação, Gaiola de passarinho)" 
                        },
                        severity: { 
                          type: "number", 
                          description: "Severidade de 0 a 100 (0-30 leve, 31-60 moderado, 61-100 severo)" 
                        },
                        location: { 
                          type: "string", 
                          description: "Localização do dano (Externa/Interna, posição aproximada)" 
                        },
                        description: { 
                          type: "string", 
                          description: "Descrição detalhada do dano observado, incluindo contagem de arames se aplicável" 
                        }
                      },
                      required: ["type", "severity", "location", "description"],
                      additionalProperties: false
                    }
                  },
                  overallSeverity: { 
                    type: "number", 
                    description: "Severidade geral do cabo de 0 a 100" 
                  },
                  overallAssessment: { 
                    type: "string", 
                    description: "Avaliação geral resumida em uma frase" 
                  },
                  recommendations: {
                    type: "array",
                    description: "Lista de recomendações técnicas",
                    items: { type: "string" }
                  },
                  suggestedAction: { 
                    type: "string", 
                    enum: ["continue", "monitor", "replace"],
                    description: "Ação sugerida: continue (operação normal), monitor (acompanhamento), replace (substituição)" 
                  },
                  confidence: { 
                    type: "number", 
                    description: "Nível de confiança da análise de 0 a 100" 
                  }
                },
                required: ["damageTypes", "overallSeverity", "overallAssessment", "recommendations", "suggestedAction", "confidence"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_cable_analysis" } },
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de taxa excedido. Tente novamente em alguns instantes.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes. Por favor, adicione fundos ao seu workspace.');
      }
      
      throw new Error(`Erro ao chamar API: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da API recebida');
    console.log('Finish reason:', data.choices?.[0]?.finish_reason);
    
    // Check if response was truncated
    if (data.choices?.[0]?.finish_reason === 'length') {
      console.error('Resposta truncada por limite de tokens');
      throw new Error('Resposta da IA foi truncada. Tente novamente.');
    }

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== 'report_cable_analysis') {
      console.error('Tool call não encontrado na resposta:', JSON.stringify(data, null, 2));
      
      // Fallback: try to parse content if tool call not present
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        console.log('Tentando fallback com content:', content);
        throw new Error('IA não usou a função esperada. Tente novamente.');
      }
      
      throw new Error('Resposta inválida da IA');
    }

    console.log('Tool call recebido:', toolCall.function.name);
    console.log('Argumentos:', toolCall.function.arguments);

    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Erro ao fazer parse dos argumentos:', parseError);
      console.error('Argumentos recebidos:', toolCall.function.arguments);
      throw new Error('Formato de resposta inválido da IA');
    }

    // Validate the structure
    if (!analysis.damageTypes || !Array.isArray(analysis.damageTypes)) {
      console.error('Estrutura inválida:', analysis);
      throw new Error('Estrutura de análise inválida');
    }

    // Ensure all required fields have defaults if missing
    analysis = {
      damageTypes: analysis.damageTypes || [],
      overallSeverity: analysis.overallSeverity ?? 0,
      overallAssessment: analysis.overallAssessment || 'Análise não disponível',
      recommendations: analysis.recommendations || [],
      suggestedAction: analysis.suggestedAction || 'monitor',
      confidence: analysis.confidence ?? 50
    };

    console.log('Análise concluída com sucesso');
    console.log('Análise detalhada:', JSON.stringify(analysis, null, 2));

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
