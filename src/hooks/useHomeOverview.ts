import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getDateLocale } from "@/utils/dateLocale";

export interface HomeOverview {
  activeServices: number;
  totalServices: number;
  activeChecklists: number;
  lowStockItems: number;
  inventoryItems: number;
  servicesByMonth: { month: string; servicos: number }[];
}

/** Aggregated counters and the 6-month service trend used on the home screen. */
export const useHomeOverview = () => {
  return useQuery({
    queryKey: ["home-overview"],
    queryFn: async (): Promise<HomeOverview> => {
      const today = format(new Date(), "yyyy-MM-dd");
      const since = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");

      const [services, activeServices, checklists, inventory] = await Promise.all([
        supabase.from("services").select("id, data_inicio").gte("data_inicio", since),
        supabase
          .from("services")
          .select("id", { count: "exact", head: true })
          .lte("data_inicio", today)
          .gte("data_termino", today),
        supabase.from("checklists").select("id", { count: "exact", head: true }),
        supabase.from("inventory").select("quantity, min_quantity"),
      ]);

      const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
      const rows = services.data ?? [];
      const servicesByMonth = months.map((date) => ({
        month: format(date, "MMM", { locale: getDateLocale() }),
        servicos: rows.filter((s) => {
          if (!s.data_inicio) return false;
          const d = new Date(s.data_inicio);
          return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        }).length,
      }));

      const items = inventory.data ?? [];

      return {
        activeServices: activeServices.count ?? 0,
        totalServices: rows.length,
        activeChecklists: checklists.count ?? 0,
        lowStockItems: items.filter(
          (i) => i.min_quantity != null && Number(i.quantity ?? 0) < Number(i.min_quantity),
        ).length,
        inventoryItems: items.length,
        servicesByMonth,
      };
    },
    staleTime: 60_000,
  });
};
