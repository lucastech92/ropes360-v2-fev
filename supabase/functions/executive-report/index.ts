import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { period } = await req.json(); // 'weekly' or 'monthly'
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const daysBack = period === "monthly" ? 30 : 7;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // Aggregate data in parallel
    const [
      servicesRes,
      maintenanceRes,
      inventoryRes,
      activityRes,
      checklistsRes,
      healthScoreRes,
      certificationsRes,
      calibrationRes,
    ] = await Promise.all([
      supabase.from("services").select("*").gte("created_at", startDate),
      supabase.from("maintenance_records").select("*"),
      supabase.from("inventory").select("*"),
      supabase.from("activity_log").select("*").gte("created_at", startDate).order("created_at", { ascending: false }).limit(50),
      supabase.from("checklists").select("*").gte("created_at", startDate),
      supabase.rpc("calculate_health_score"),
      supabase.from("certifications").select("*"),
      supabase.from("inventory").select("*").eq("item_type", "equipamento").not("next_calibration", "is", null),
    ]);

    const services = servicesRes.data || [];
    const maintenance = maintenanceRes.data || [];
    const inventory = inventoryRes.data || [];
    const activities = activityRes.data || [];
    const checklists = checklistsRes.data || [];
    const healthScore = healthScoreRes.data;
    const certifications = certificationsRes.data || [];
    const calibrationItems = calibrationRes.data || [];

    // Compute stats
    const pendingMaint = maintenance.filter((m: any) => m.status === "pendente").length;
    const inProgressMaint = maintenance.filter((m: any) => m.status === "em andamento").length;
    const completedMaint = maintenance.filter((m: any) => m.status === "concluído").length;
    const lowStockItems = inventory.filter((i: any) => i.min_quantity && i.quantity < i.min_quantity);
    const expiringCerts = certifications.filter((c: any) => {
      const diff = (new Date(c.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    });
    const overdueCalibs = calibrationItems.filter((i: any) => new Date(i.next_calibration) < now);
    const recentMaintCompleted = maintenance.filter((m: any) => m.completion_date && new Date(m.completion_date) >= new Date(startDate)).length;

    const periodLabel = period === "monthly" ? "últimos 30 dias" : "última semana";

    const dataContext = `
## Dados Operacionais — ${periodLabel}

### Health Score Operacional
${JSON.stringify(healthScore)}

### Serviços (${periodLabel})
- Novos serviços: ${services.length}
- Clientes atendidos: ${[...new Set(services.map((s: any) => s.cliente))].join(", ") || "N/A"}

### Manutenção
- Total registros: ${maintenance.length}
- Pendentes: ${pendingMaint}
- Em andamento: ${inProgressMaint}
- Concluídas: ${completedMaint}
- Concluídas no período: ${recentMaintCompleted}

### Inventário
- Total itens: ${inventory.length}
- Itens com estoque baixo (${lowStockItems.length}): ${lowStockItems.map((i: any) => `${i.item_name} (${i.quantity}/${i.min_quantity})`).join(", ") || "Nenhum"}

### Certificações
- Total: ${certifications.length}
- Vencendo em 30 dias (${expiringCerts.length}): ${expiringCerts.map((c: any) => c.certification_name).join(", ") || "Nenhuma"}

### Calibrações
- Equipamentos com calibração: ${calibrationItems.length}
- Calibrações vencidas (${overdueCalibs.length}): ${overdueCalibs.map((i: any) => `${i.item_name} (${i.code || "s/c"})`).join(", ") || "Nenhuma"}

### Atividades no período
- Total ações registradas: ${activities.length}
- Módulos mais ativos: ${Object.entries(activities.reduce((acc: any, a: any) => { acc[a.module] = (acc[a.module] || 0) + 1; return acc; }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([m, c]) => `${m} (${c})`).join(", ") || "N/A"}

### Checklists
- Novos no período: ${checklists.length}
`;

    const systemPrompt = `Você é um analista operacional sênior da JBR Engenharia, especializada em inspeção de cabos de aço e serviços industriais.

Gere um RELATÓRIO EXECUTIVO profissional para a diretoria com base nos dados operacionais fornecidos.

O relatório deve conter estas seções em markdown:
1. **Resumo Executivo** — Parágrafo conciso do estado operacional
2. **Health Score** — Análise do score com indicadores por área
3. **Serviços** — Volume, clientes, tendências
4. **Manutenção & Calibração** — Status, gargalos, riscos
5. **Inventário** — Situação de estoque, itens críticos
6. **Certificações** — Conformidade da equipe
7. **Recomendações Estratégicas** — 3-5 ações prioritárias com impacto esperado
8. **Indicadores-Chave (KPIs)** — Tabela resumo

Use linguagem executiva, objetiva. Destaque riscos com ⚠️ e conquistas com ✅.
Período: ${periodLabel}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: dataContext },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("executive-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

