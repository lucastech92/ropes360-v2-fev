import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HealthScoreData {
  overall: number;
  certifications: { score: number; total: number; valid: number };
  calibrations: { score: number; total: number; valid: number };
  maintenance: { score: number; total: number; ontime: number };
  inventory: { score: number; total: number; ok: number };
}

export const useHealthScore = () => {
  return useQuery({
    queryKey: ["health-score"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calculate_health_score");
      if (error) throw error;
      return data as unknown as HealthScoreData;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
};
