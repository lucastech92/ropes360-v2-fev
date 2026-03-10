import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ItemType = "consumivel" | "equipamento";
export type EquipmentStatus = "available" | "in_service" | "maintenance" | "calibration" | "inactive";
export type EquipmentCondition = "excellent" | "good" | "fair" | "needs_repair" | "damaged";

export interface UnifiedInventoryItem {
  id: string;
  item_name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  location: string | null;
  min_quantity: number | null;
  notes: string | null;
  item_type: ItemType;
  code: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  status: EquipmentStatus | null;
  condition: EquipmentCondition | null;
  acquisition_date: string | null;
  last_calibration: string | null;
  next_calibration: string | null;
  calibration_interval_months: number | null;
  photo_url: string | null;
  current_location: string | null;
  last_updated: string | null;
}

export interface InventoryAllocation {
  id: string;
  inventory_item_id: string;
  service_id: string | null;
  checkout_date: string;
  checked_out_by: string;
  condition_on_checkout: EquipmentCondition;
  checkout_notes: string | null;
  destination: string | null;
  checkin_date: string | null;
  checked_in_by: string | null;
  condition_on_checkin: EquipmentCondition | null;
  checkin_notes: string | null;
}

export interface InventoryStats {
  total: number;
  consumiveis: number;
  equipamentos: number;
  lowStock: number;
  available: number;
  inService: number;
  maintenance: number;
  calibrationDue: number;
}

export const useUnifiedInventory = () => {
  const [items, setItems] = useState<UnifiedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InventoryStats>({
    total: 0,
    consumiveis: 0,
    equipamentos: 0,
    lowStock: 0,
    available: 0,
    inService: 0,
    maintenance: 0,
    calibrationDue: 0,
  });
  const { toast } = useToast();

  const fetchItems = async () => {
    setLoading(true);
    try {
      // Ensure user is authenticated before fetching
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setItems([]);
        calculateStats([]);
        return;
      }

      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("item_name");

      if (error) throw error;

      const typedData = (data || []) as UnifiedInventoryItem[];
      setItems(typedData);
      calculateStats(typedData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar itens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: UnifiedInventoryItem[]) => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    setStats({
      total: data.length,
      consumiveis: data.filter((i) => i.item_type === "consumivel").length,
      equipamentos: data.filter((i) => i.item_type === "equipamento").length,
      lowStock: data.filter((i) => i.min_quantity && i.quantity <= i.min_quantity).length,
      available: data.filter((i) => i.item_type === "equipamento" && i.status === "available").length,
      inService: data.filter((i) => i.item_type === "equipamento" && i.status === "in_service").length,
      maintenance: data.filter((i) => i.item_type === "equipamento" && i.status === "maintenance").length,
      calibrationDue: data.filter((i) => {
        if (i.item_type !== "equipamento" || !i.next_calibration) return false;
        return new Date(i.next_calibration) <= thirtyDaysFromNow;
      }).length,
    });
  };

  const createItem = async (item: Partial<UnifiedInventoryItem>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const insertData = {
        ...item,
        updated_by: user.id,
        code: item.code && item.code.trim() !== "" ? item.code.trim() : null,
        acquisition_date: item.acquisition_date || null,
        last_calibration: item.last_calibration || null,
        next_calibration: item.next_calibration || null,
      };

      const { error } = await supabase.from("inventory").insert(insertData as any);

      if (error) throw error;

      toast({
        title: "Item criado",
        description: `${item.item_type === "equipamento" ? "Equipamento" : "Consumível"} adicionado com sucesso`,
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      const friendlyMessage =
        error?.code === "23505" &&
        String(error?.message || "").includes("inventory_code_unique")
          ? "Já existe um item com este código. Informe um código diferente ou deixe o campo em branco."
          : error?.message;

      toast({
        title: "Erro ao criar item",
        description: friendlyMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateItem = async (id: string, item: Partial<UnifiedInventoryItem>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: any = {
        ...item,
        updated_by: user?.id,
        last_updated: new Date().toISOString(),
        acquisition_date: item.acquisition_date || null,
        last_calibration: item.last_calibration || null,
        next_calibration: item.next_calibration || null,
      };

      if (typeof item.code === "string") {
        updateData.code = item.code.trim() !== "" ? item.code.trim() : null;
      }

      const { error } = await supabase
        .from("inventory")
        .update(updateData as any)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Item atualizado",
        description: "As alterações foram salvas",
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      const friendlyMessage =
        error?.code === "23505" &&
        String(error?.message || "").includes("inventory_code_unique")
          ? "Já existe um item com este código. Informe um código diferente ou deixe o campo em branco."
          : error?.message;

      toast({
        title: "Erro ao atualizar item",
        description: friendlyMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      // Delete related records first to avoid foreign key violations
      const { error: maintenanceError } = await supabase
        .from("maintenance_records")
        .delete()
        .eq("inventory_item_id", id);
      if (maintenanceError) throw maintenanceError;

      const { error: allocationsError } = await supabase
        .from("inventory_allocations")
        .delete()
        .eq("inventory_item_id", id);
      if (allocationsError) throw allocationsError;

      const { error: consumptionError } = await supabase
        .from("inventory_consumption_history")
        .delete()
        .eq("inventory_item_id", id);
      if (consumptionError) throw consumptionError;

      const { error: predictionsError } = await supabase
        .from("inventory_predictions")
        .delete()
        .eq("inventory_item_id", id);
      if (predictionsError) throw predictionsError;

      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Item removido",
        description: "Item foi removido do inventário",
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover item",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const checkoutItem = async (
    itemId: string,
    destination: string,
    serviceId: string | null,
    condition: EquipmentCondition,
    notes: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create allocation record
      const { error: allocationError } = await supabase.from("inventory_allocations").insert({
        inventory_item_id: itemId,
        service_id: serviceId || null,
        checked_out_by: user.id,
        condition_on_checkout: condition,
        checkout_notes: notes,
        destination,
      } as any);

      if (allocationError) throw allocationError;

      // Update item status
      const { error: updateError } = await supabase
        .from("inventory")
        .update({
          status: "in_service",
          current_location: destination,
        } as any)
        .eq("id", itemId);

      if (updateError) throw updateError;

      toast({
        title: "Check-out realizado",
        description: "Equipamento alocado com sucesso",
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro no check-out",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const checkinItem = async (
    itemId: string,
    allocationId: string,
    condition: EquipmentCondition,
    notes: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Update allocation record
      const { error: allocationError } = await supabase
        .from("inventory_allocations")
        .update({
          checkin_date: new Date().toISOString(),
          checked_in_by: user.id,
          condition_on_checkin: condition,
          checkin_notes: notes,
        } as any)
        .eq("id", allocationId);

      if (allocationError) throw allocationError;

      // Update item status
      const newStatus = condition === "needs_repair" || condition === "damaged" ? "maintenance" : "available";
      const { error: updateError } = await supabase
        .from("inventory")
        .update({
          status: newStatus,
          condition,
          current_location: "Base",
        } as any)
        .eq("id", itemId);

      if (updateError) throw updateError;

      toast({
        title: "Check-in realizado",
        description: "Equipamento devolvido com sucesso",
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro no check-in",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const fetchAllocations = async (itemId: string): Promise<InventoryAllocation[]> => {
    try {
      const { data, error } = await supabase
        .from("inventory_allocations")
        .select("*")
        .eq("inventory_item_id", itemId)
        .order("checkout_date", { ascending: false });

      if (error) throw error;
      return (data || []) as InventoryAllocation[];
    } catch (error: any) {
      toast({
        title: "Erro ao carregar alocações",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  useEffect(() => {
    // Subscribe to auth state changes and fetch items when authenticated
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchItems();
      } else {
        setItems([]);
        calculateStats([]);
        setLoading(false);
      }
    });

    // Initial fetch
    fetchItems();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    items,
    loading,
    stats,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    checkoutItem,
    checkinItem,
    fetchAllocations,
  };
};
