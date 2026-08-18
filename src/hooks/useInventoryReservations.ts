import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReservationItem {
  checklist_item_id: string;
  inventory_item_id: string;
  item_name: string;
  planned_quantity: number;
  dispatched_quantity: number;
  reserved_quantity: number;
}

export interface ReservationGroup {
  checklist_id: string;
  checklist_name: string;
  created_at: string | null;
  service_id: string | null;
  service_code: string | null;
  service_client: string | null;
  is_unlinked: boolean;
  reserved_quantity: number;
  items: ReservationItem[];
}

export interface ReservationSummary {
  reservedUnits: number;
  reservedItems: number;
  unlinkedReservedUnits: number;
  unlinkedChecklists: number;
}

export const useInventoryReservations = () => {
  const [groups, setGroups] = useState<ReservationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReservationSummary>({
    reservedUnits: 0,
    reservedItems: 0,
    unlinkedReservedUnits: 0,
    unlinkedChecklists: 0,
  });

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setGroups([]);
        setSummary({ reservedUnits: 0, reservedItems: 0, unlinkedReservedUnits: 0, unlinkedChecklists: 0 });
        return;
      }

      // Active outbound checklists (same rule as inventory_stock_availability view)
      const { data: checklists, error: checklistsError } = await supabase
        .from("checklists")
        .select("id, name, created_at, checklist_type, is_template, is_saved")
        .eq("checklist_type", "saida");
      if (checklistsError) throw checklistsError;

      const activeChecklists = (checklists || []).filter(
        (c: any) => !c.is_template && !c.is_saved,
      );
      const checklistIds = activeChecklists.map((c: any) => c.id);
      if (checklistIds.length === 0) {
        setGroups([]);
        setSummary({ reservedUnits: 0, reservedItems: 0, unlinkedReservedUnits: 0, unlinkedChecklists: 0 });
        return;
      }

      const [itemsResult, dispatchResult, linkResult] = await Promise.all([
        supabase
          .from("checklist_items")
          .select("id, checklist_id, item_text, target_quantity, inventory_item_id")
          .in("checklist_id", checklistIds)
          .not("inventory_item_id", "is", null),
        supabase
          .from("service_dispatch_items")
          .select("source_checklist_item_id, dispatched_quantity")
          .in("source_checklist_id", checklistIds),
        supabase
          .from("service_checklists")
          .select("checklist_id, service_id, services(codigo_jbr, cliente)")
          .in("checklist_id", checklistIds),
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (dispatchResult.error) throw dispatchResult.error;
      if (linkResult.error) throw linkResult.error;

      const dispatchedByItem = new Map<string, number>();
      (dispatchResult.data || []).forEach((row: any) => {
        dispatchedByItem.set(
          row.source_checklist_item_id,
          (dispatchedByItem.get(row.source_checklist_item_id) || 0) + (row.dispatched_quantity || 0),
        );
      });

      const linkByChecklist = new Map<string, any>();
      (linkResult.data || []).forEach((row: any) => {
        if (!linkByChecklist.has(row.checklist_id)) linkByChecklist.set(row.checklist_id, row);
      });

      // Item names from inventory
      const inventoryIds = Array.from(
        new Set((itemsResult.data || []).map((i: any) => i.inventory_item_id).filter(Boolean)),
      );
      const nameById = new Map<string, string>();
      if (inventoryIds.length > 0) {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("inventory")
          .select("id, item_name")
          .in("id", inventoryIds);
        if (inventoryError) throw inventoryError;
        (inventoryData || []).forEach((row: any) => nameById.set(row.id, row.item_name));
      }

      const byChecklist = new Map<string, ReservationGroup>();
      activeChecklists.forEach((c: any) => {
        const link = linkByChecklist.get(c.id);
        byChecklist.set(c.id, {
          checklist_id: c.id,
          checklist_name: c.name,
          created_at: c.created_at ?? null,
          service_id: link?.service_id ?? null,
          service_code: link?.services?.codigo_jbr ?? null,
          service_client: link?.services?.cliente ?? null,
          is_unlinked: !link,
          reserved_quantity: 0,
          items: [],
        });
      });

      const reservedInventoryIds = new Set<string>();
      (itemsResult.data || []).forEach((row: any) => {
        const planned = row.target_quantity || 0;
        const dispatched = dispatchedByItem.get(row.id) || 0;
        const reserved = Math.max(planned - dispatched, 0);
        if (reserved <= 0) return;
        const group = byChecklist.get(row.checklist_id);
        if (!group) return;
        group.items.push({
          checklist_item_id: row.id,
          inventory_item_id: row.inventory_item_id,
          item_name: nameById.get(row.inventory_item_id) || row.item_text,
          planned_quantity: planned,
          dispatched_quantity: dispatched,
          reserved_quantity: reserved,
        });
        group.reserved_quantity += reserved;
        reservedInventoryIds.add(row.inventory_item_id);
      });

      const result = Array.from(byChecklist.values())
        .filter((g) => g.reserved_quantity > 0)
        .sort((a, b) => {
          if (a.is_unlinked !== b.is_unlinked) return a.is_unlinked ? -1 : 1;
          return b.reserved_quantity - a.reserved_quantity;
        });

      result.forEach((g) => g.items.sort((a, b) => b.reserved_quantity - a.reserved_quantity));

      setGroups(result);
      setSummary({
        reservedUnits: result.reduce((sum, g) => sum + g.reserved_quantity, 0),
        reservedItems: reservedInventoryIds.size,
        unlinkedReservedUnits: result
          .filter((g) => g.is_unlinked)
          .reduce((sum, g) => sum + g.reserved_quantity, 0),
        unlinkedChecklists: result.filter((g) => g.is_unlinked).length,
      });
    } catch (error) {
      console.error("Erro ao carregar reservas de estoque", error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  return { groups, summary, loading, refetch: fetchReservations };
};
