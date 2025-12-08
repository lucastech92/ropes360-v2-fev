import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch inventory data with consumption history
    const { data: inventory, error: invError } = await supabase
      .from("inventory")
      .select("*")
      .order("item_name");

    if (invError) throw invError;

    // Fetch consumption history (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: consumptionHistory, error: histError } = await supabase
      .from("inventory_consumption_history")
      .select("*")
      .gte("created_at", ninetyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (histError) throw histError;

    // Fetch recent allocations for equipment usage patterns
    const { data: allocations, error: allocError } = await supabase
      .from("inventory_allocations")
      .select("*, services(cliente, escopo)")
      .gte("checkout_date", ninetyDaysAgo.toISOString());

    if (allocError) throw allocError;

    // Aggregate data by item
    const itemStats = inventory?.map((item: any) => {
      const itemHistory = consumptionHistory?.filter(
        (h: any) => h.inventory_item_id === item.id
      ) || [];
      
      const itemAllocations = allocations?.filter(
        (a: any) => a.inventory_item_id === item.id
      ) || [];

      // Calculate consumption rate (units per day)
      const totalConsumption = itemHistory
        .filter((h: any) => h.change_type === "consumption")
        .reduce((sum: number, h: any) => sum + Math.abs(h.quantity_change), 0);

      const totalRestock = itemHistory
        .filter((h: any) => h.change_type === "restock")
        .reduce((sum: number, h: any) => sum + h.quantity_change, 0);

      const dailyConsumptionRate = totalConsumption / 90;

      // Days until stockout
      const daysUntilStockout = dailyConsumptionRate > 0 
        ? Math.round(item.quantity / dailyConsumptionRate) 
        : null;

      // Weekly consumption trend
      const weeklyConsumption: number[] = [];
      for (let i = 0; i < 12; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        
        const weekConsumption = itemHistory
          .filter((h: any) => {
            const date = new Date(h.created_at);
            return date >= weekStart && date < weekEnd && h.change_type === "consumption";
          })
          .reduce((sum: number, h: any) => sum + Math.abs(h.quantity_change), 0);
        
        weeklyConsumption.unshift(weekConsumption);
      }

      return {
        id: item.id,
        name: item.item_name,
        category: item.category,
        currentQuantity: item.quantity,
        minQuantity: item.min_quantity,
        unit: item.unit,
        itemType: item.item_type,
        totalConsumption,
        totalRestock,
        dailyConsumptionRate: Math.round(dailyConsumptionRate * 100) / 100,
        daysUntilStockout,
        weeklyConsumption,
        allocationCount: itemAllocations.length,
        isLowStock: item.min_quantity && item.quantity <= item.min_quantity,
        isCritical: daysUntilStockout !== null && daysUntilStockout <= 7,
      };
    }) || [];

    // Prepare context for AI analysis
    const criticalItems = itemStats.filter((i: any) => i.isCritical || i.isLowStock);
    const highConsumptionItems = itemStats
      .filter((i: any) => i.dailyConsumptionRate > 0)
      .sort((a: any, b: any) => b.dailyConsumptionRate - a.dailyConsumptionRate)
      .slice(0, 10);

    // Get AI insights
    let aiInsights = null;
    if (lovableApiKey && (criticalItems.length > 0 || highConsumptionItems.length > 0)) {
      const prompt = `Analise os seguintes dados de consumo de inventário e forneça insights acionáveis em português:

ITENS CRÍTICOS (estoque baixo ou esgotamento em menos de 7 dias):
${JSON.stringify(criticalItems.map((i: any) => ({
  nome: i.name,
  categoria: i.category,
  quantidadeAtual: i.currentQuantity,
  minimo: i.minQuantity,
  diasAteEsgotamento: i.daysUntilStockout,
  consumoDiario: i.dailyConsumptionRate,
})), null, 2)}

TOP 10 ITENS COM MAIOR CONSUMO:
${JSON.stringify(highConsumptionItems.map((i: any) => ({
  nome: i.name,
  categoria: i.category,
  consumoDiario: i.dailyConsumptionRate,
  consumoSemanal: i.weeklyConsumption,
  quantidadeAtual: i.currentQuantity,
})), null, 2)}

Forneça uma resposta JSON com a estrutura:
{
  "urgentActions": ["ação 1", "ação 2"],
  "trends": ["tendência 1", "tendência 2"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "predictedRestockNeeds": [
    {"item": "nome", "suggestedQuantity": 100, "reason": "motivo"}
  ]
}`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Você é um especialista em gestão de inventário e supply chain. Analise dados e forneça insights práticos e acionáveis." },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              aiInsights = JSON.parse(content);
            } catch {
              aiInsights = { rawInsight: content };
            }
          }
        }
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
      }
    }

    // Store predictions in database
    if (aiInsights?.predictedRestockNeeds) {
      for (const need of aiInsights.predictedRestockNeeds) {
        const matchingItem = itemStats.find((i: any) => 
          i.name.toLowerCase().includes(need.item.toLowerCase())
        );
        if (matchingItem) {
          await supabase.from("inventory_predictions").upsert({
            inventory_item_id: matchingItem.id,
            prediction_type: "restock_date",
            predicted_value: {
              suggestedQuantity: need.suggestedQuantity,
              reason: need.reason,
            },
            confidence_score: 0.75,
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }, {
            onConflict: "inventory_item_id,prediction_type",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        summary: {
          totalItems: itemStats.length,
          criticalCount: criticalItems.length,
          lowStockCount: itemStats.filter((i: any) => i.isLowStock).length,
          averageConsumptionRate: Math.round(
            itemStats.reduce((sum: number, i: any) => sum + i.dailyConsumptionRate, 0) / 
            itemStats.length * 100
          ) / 100,
        },
        criticalItems,
        highConsumptionItems,
        itemStats,
        aiInsights,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in inventory-trends-ai:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
