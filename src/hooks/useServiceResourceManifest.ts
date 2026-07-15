import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ManifestStatus = "planned" | "dispatched" | "returned" | "cancelled";

export interface ServiceResourceManifestItem {
  id: string;
  inventory_item_id: string;
  planned_quantity: number;
  dispatched_quantity: number;
  returned_quantity: number | null;
  consumed_quantity: number;
  status: ManifestStatus;
  notes: string | null;
  inventory: {
    item_name: string;
    item_type: "consumivel" | "equipamento";
    unit: string | null;
    quantity: number;
  } | null;
}

export interface AvailableResource {
  id: string;
  item_name: string;
  item_type: "consumivel" | "equipamento";
  unit: string | null;
  quantity: number;
  status: string | null;
}

export const useServiceResourceManifest = (serviceId: string | undefined) => {
  const [items, setItems] = useState<ServiceResourceManifestItem[]>([]);
  const [availableResources, setAvailableResources] = useState<AvailableResource[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!serviceId) return;
    setLoading(true);
    const [manifestResult, inventoryResult] = await Promise.all([
      supabase
        .from("service_resource_manifest_items")
        .select("id, inventory_item_id, planned_quantity, dispatched_quantity, returned_quantity, consumed_quantity, status, notes, inventory:inventory_item_id(item_name, item_type, unit, quantity)")
        .eq("service_id", serviceId)
        .order("created_at"),
      supabase
        .from("inventory")
        .select("id, item_name, item_type, unit, quantity, status")
        .gt("quantity", 0)
        .order("item_name"),
    ]);

    if (!manifestResult.error) setItems((manifestResult.data ?? []) as ServiceResourceManifestItem[]);
    if (!inventoryResult.error) setAvailableResources((inventoryResult.data ?? []) as AvailableResource[]);
    setLoading(false);
  }, [serviceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addResource = async (inventoryItemId: string, quantity: number, notes: string) => {
    if (!serviceId) return { error: new Error("JBR não informado") };
    const { error } = await supabase.rpc("upsert_service_resource_manifest", {
      p_service_id: serviceId,
      p_inventory_item_id: inventoryItemId,
      p_planned_quantity: quantity,
      p_notes: notes || null,
    });
    if (!error) await refresh();
    return { error };
  };

  const dispatchResource = async (manifestId: string, quantity: number) => {
    const { error } = await supabase.rpc("dispatch_service_resource_manifest", {
      p_manifest_id: manifestId,
      p_dispatched_quantity: quantity,
    });
    if (!error) await refresh();
    return { error };
  };

  const returnResource = async (manifestId: string, returnedQuantity: number, consumedQuantity: number, notes: string) => {
    const { error } = await supabase.rpc("return_service_resource_manifest", {
      p_manifest_id: manifestId,
      p_returned_quantity: returnedQuantity,
      p_consumed_quantity: consumedQuantity,
      p_notes: notes || null,
    });
    if (!error) await refresh();
    return { error };
  };

  return { items, availableResources, loading, addResource, dispatchResource, returnResource };
};
