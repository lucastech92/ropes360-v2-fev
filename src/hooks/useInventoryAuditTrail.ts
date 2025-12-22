import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InventoryAuditEntry {
  id: string;
  inventory_item_id: string;
  item_name: string | null;
  quantity_change: number;
  change_type: string;
  previous_quantity: number;
  new_quantity: number;
  service_id: string | null;
  checklist_id: string | null;
  created_by: string | null;
  created_at: string;
  notes: string | null;
  action_source: string | null;
  // Joined data
  user_name?: string | null;
  service_code?: string | null;
  checklist_name?: string | null;
}

export interface AuditFilters {
  itemId?: string;
  changeType?: string;
  actionSource?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

export function useInventoryAuditTrail(filters?: AuditFilters) {
  const [entries, setEntries] = useState<InventoryAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditTrail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("inventory_consumption_history")
        .select(`
          *,
          inventory:inventory_item_id (item_name),
          services:service_id (codigo_jbr),
          checklists:checklist_id (name),
          profiles:created_by (full_name)
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.itemId) {
        query = query.eq("inventory_item_id", filters.itemId);
      }
      if (filters?.changeType) {
        query = query.eq("change_type", filters.changeType);
      }
      if (filters?.actionSource) {
        query = query.eq("action_source", filters.actionSource);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", `${filters.dateTo}T23:59:59`);
      }
      if (filters?.userId) {
        query = query.eq("created_by", filters.userId);
      }

      const { data, error: queryError } = await query.limit(500);

      if (queryError) throw queryError;

      // Transform data to flatten joined fields
      const transformedData: InventoryAuditEntry[] = (data || []).map((entry: any) => ({
        id: entry.id,
        inventory_item_id: entry.inventory_item_id,
        item_name: entry.item_name || entry.inventory?.item_name || "Item desconhecido",
        quantity_change: entry.quantity_change,
        change_type: entry.change_type,
        previous_quantity: entry.previous_quantity,
        new_quantity: entry.new_quantity,
        service_id: entry.service_id,
        checklist_id: entry.checklist_id,
        created_by: entry.created_by,
        created_at: entry.created_at,
        notes: entry.notes,
        action_source: entry.action_source || "manual",
        user_name: entry.profiles?.full_name,
        service_code: entry.services?.codigo_jbr,
        checklist_name: entry.checklists?.name,
      }));

      setEntries(transformedData);
    } catch (err: any) {
      console.error("Error fetching audit trail:", err);
      setError(err.message || "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }, [filters?.itemId, filters?.changeType, filters?.actionSource, filters?.dateFrom, filters?.dateTo, filters?.userId]);

  useEffect(() => {
    fetchAuditTrail();
  }, [fetchAuditTrail]);

  return {
    entries,
    loading,
    error,
    refetch: fetchAuditTrail,
  };
}
