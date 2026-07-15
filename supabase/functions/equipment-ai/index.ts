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
    const { action, serviceScope, equipmentId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "suggest_equipment") {
      // Get available equipment
      const { data: equipment, error: eqError } = await supabase
        .from("equipment")
        .select("*")
        .in("status", ["available", "in_service"]);

      if (eqError) throw eqError;

      // Map scope to relevant equipment categories
      const scopeCategoryMap: Record<string, string[]> = {
        "MRT - Eletromagnético": ["MRT", "Medição"],
        "Inspeção Visual": ["Medição", "Ferramental"],
        "Soquetagem": ["Ferramental"],
        "Lubrificação": ["Ferramental"],
        "Spooler": ["MRT", "Ferramental"],
      };

      const relevantCategories = serviceScope
        ?.flatMap((scope: string) => scopeCategoryMap[scope] || [])
        .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) || [];

      // Filter and score equipment
      const suggestions = equipment
        ?.map((eq: any) => {
          let score = 0;
          let reason = "";

          if (relevantCategories.includes(eq.category)) {
            score += 50;
            reason = `Categoria ${eq.category} é relevante para o escopo`;
          }

          if (eq.status === "available") {
            score += 30;
            reason += reason ? ". " : "";
            reason += "Disponível imediatamente";
          } else {
            reason += reason ? ". " : "";
            reason += "Em serviço (verificar disponibilidade)";
          }

          if (eq.condition === "excellent" || eq.condition === "good") {
            score += 20;
          }

          // Check calibration
          if (eq.next_calibration) {
            const daysUntil = Math.ceil(
              (new Date(eq.next_calibration).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntil < 0) {
              score -= 100; // Calibration expired
              reason += ". ⚠️ Calibração vencida";
            } else if (daysUntil < 30) {
              score -= 10;
              reason += `. ⚠️ Calibração em ${daysUntil} dias`;
            }
          }

          return { ...eq, score, reason };
        })
        .filter((eq: any) => eq.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_alerts") {
      // Get equipment needing attention
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: calibrationAlerts } = await supabase
        .from("equipment")
        .select("id, name, code, next_calibration")
        .not("next_calibration", "is", null)
        .lte("next_calibration", thirtyDaysFromNow)
        .eq("status", "available");

      const { data: maintenanceNeeded } = await supabase
        .from("equipment")
        .select("id, name, code, condition")
        .in("condition", ["needs_repair", "damaged"]);

      // Get idle equipment (available for more than 60 days without allocation)
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: idleEquipment } = await supabase
        .from("equipment")
        .select("id, name, code, updated_at")
        .eq("status", "available")
        .lt("updated_at", sixtyDaysAgo);

      const alerts = {
        calibration: calibrationAlerts || [],
        maintenance: maintenanceNeeded || [],
        idle: idleEquipment || [],
      };

      return new Response(JSON.stringify({ alerts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "analyze_utilization") {
      // Get allocation statistics
      const { data: allocations } = await supabase
        .from("equipment_allocations")
        .select("equipment_id, checkout_date, checkin_date");

      const { data: equipment } = await supabase
        .from("equipment")
        .select("id, name, code, category");

      // Calculate utilization per equipment
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      const utilization = equipment?.map((eq: any) => {
        const eqAllocations = allocations?.filter((a: any) => a.equipment_id === eq.id) || [];
        
        let totalDaysInService = 0;
        eqAllocations.forEach((a: any) => {
          const start = Math.max(new Date(a.checkout_date).getTime(), thirtyDaysAgo);
          const end = a.checkin_date ? new Date(a.checkin_date).getTime() : now;
          if (start < end) {
            totalDaysInService += (end - start) / (1000 * 60 * 60 * 24);
          }
        });

        const utilizationRate = Math.min(100, Math.round((totalDaysInService / 30) * 100));

        return {
          ...eq,
          utilizationRate,
          totalAllocations: eqAllocations.length,
        };
      });

      return new Response(JSON.stringify({ utilization }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Equipment AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

