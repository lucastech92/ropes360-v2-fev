import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getDateLocale } from "@/utils/dateLocale";

export interface HomeAccessHubData {
  inventory: {
    catalogItems: number;
    physicalUnits: number;
    lowStock: number;
    trend: { month: string; value: number }[];
  };
  meetings: {
    minutes: number;
    openActions: number;
    overdueActions: number;
    trend: { month: string; value: number }[];
  };
  models: {
    packages: number;
    files: number;
    trend: { month: string; value: number }[];
  };
  management: {
    approvedUsers: number;
    pendingUsers: number;
    roles: { name: string; value: number }[];
  };
}

const emptyData: HomeAccessHubData = {
  inventory: { catalogItems: 0, physicalUnits: 0, lowStock: 0, trend: [] },
  meetings: { minutes: 0, openActions: 0, overdueActions: 0, trend: [] },
  models: { packages: 0, files: 0, trend: [] },
  management: { approvedUsers: 0, pendingUsers: 0, roles: [] },
};

const buildMonthlyTrend = (dates: (string | null)[], months: Date[]) =>
  months.map((month) => ({
    month: format(month, "MMM", { locale: getDateLocale() }),
    value: dates.filter((value) => {
      if (!value) return false;
      const date = new Date(value);
      return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
    }).length,
  }));

/** Live data for the four primary access areas on the Home screen. */
export const useHomeAccessHub = (includeManagement: boolean) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["home-access-hub", includeManagement],
    queryFn: async (): Promise<HomeAccessHubData> => {
      const since = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");
      const months = Array.from({ length: 6 }, (_, index) => startOfMonth(subMonths(new Date(), 5 - index)));

      const baseRequests = await Promise.all([
        supabase.from("inventory").select("quantity, min_quantity"),
        supabase.from("inventory_consumption_history").select("created_at, quantity_change").gte("created_at", since),
        supabase.from("inspection_packages").select("created_at").gte("created_at", since),
        supabase.from("inspection_package_files").select("id", { count: "exact", head: true }),
      ]);

      const [inventoryResult, movementsResult, packagesResult, filesResult] = baseRequests;
      const inventoryRows = inventoryResult.data ?? [];
      const movementRows = movementsResult.data ?? [];
      const packageRows = packagesResult.data ?? [];

      const inventoryTrend = months.map((month) => ({
        month: format(month, "MMM", { locale: getDateLocale() }),
        value: movementRows
          .filter((row) => {
            const date = new Date(row.created_at);
            return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
          })
          .reduce((sum, row) => sum + Number(row.quantity_change), 0),
      }));

      const result: HomeAccessHubData = {
        ...emptyData,
        inventory: {
          catalogItems: inventoryRows.length,
          physicalUnits: inventoryRows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0),
          lowStock: inventoryRows.filter(
            (row) => row.min_quantity != null && Number(row.quantity ?? 0) < Number(row.min_quantity),
          ).length,
          trend: inventoryTrend,
        },
        models: {
          packages: packageRows.length,
          files: filesResult.count ?? 0,
          trend: buildMonthlyTrend(packageRows.map((row) => row.created_at), months),
        },
      };

      if (!includeManagement) return result;

      const [minutesResult, actionsResult, rolesResult] = await Promise.all([
        supabase.from("meeting_minutes").select("meeting_date").gte("meeting_date", since),
        supabase.from("meeting_action_items").select("status, due_date"),
        supabase.from("user_roles").select("user_id, role, approved"),
      ]);

      const minuteRows = minutesResult.data ?? [];
      const actionRows = actionsResult.data ?? [];
      const roleRows = rolesResult.data ?? [];
      const openActions = actionRows.filter((row) => row.status !== "completed");
      const approvedRows = roleRows.filter((row) => row.approved);
      const roleLabels: Record<string, string> = {
        admin: "Admin",
        moderator: "Moderador",
        inspector: "Inspetor",
        viewer: "Visualizador",
      };

      result.meetings = {
        minutes: minuteRows.length,
        openActions: openActions.length,
        overdueActions: openActions.filter((row) => row.due_date != null && row.due_date < today).length,
        trend: buildMonthlyTrend(minuteRows.map((row) => row.meeting_date), months),
      };
      result.management = {
        approvedUsers: new Set(approvedRows.map((row) => row.user_id)).size,
        pendingUsers: new Set(roleRows.filter((row) => !row.approved).map((row) => row.user_id)).size,
        roles: Object.entries(roleLabels).map(([role, name]) => ({
          name,
          value: approvedRows.filter((row) => row.role === role).length,
        })),
      };

      return result;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const tables = includeManagement
      ? ["inventory", "inspection_packages", "inspection_package_files", "meeting_minutes", "meeting_action_items", "user_roles"]
      : ["inventory", "inspection_packages", "inspection_package_files"];
    const channel = supabase.channel(`home-access-hub-${includeManagement ? "management" : "operation"}`);

    tables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        queryClient.invalidateQueries({ queryKey: ["home-access-hub"] });
      });
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [includeManagement, queryClient]);

  return query;
};