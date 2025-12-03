import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/utils/activityLogger";

export type EquipmentStatus = "available" | "in_service" | "maintenance" | "calibration" | "inactive";
export type EquipmentCondition = "excellent" | "good" | "fair" | "needs_repair" | "damaged";

export interface Equipment {
  id: string;
  name: string;
  code: string;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  category: string;
  acquisition_date: string | null;
  last_calibration: string | null;
  next_calibration: string | null;
  calibration_interval_months: number | null;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  current_service_id: string | null;
  current_location: string | null;
  inventory_item_id: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface EquipmentAllocation {
  id: string;
  equipment_id: string;
  service_id: string | null;
  checkout_date: string;
  checked_out_by: string;
  condition_on_checkout: EquipmentCondition;
  checkout_notes: string | null;
  checkin_date: string | null;
  checked_in_by: string | null;
  condition_on_checkin: EquipmentCondition | null;
  checkin_notes: string | null;
  destination: string | null;
  created_at: string;
}

export interface EquipmentStats {
  total: number;
  available: number;
  inService: number;
  maintenance: number;
  calibrationDue: number;
}

export const useEquipment = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EquipmentStats>({
    total: 0,
    available: 0,
    inService: 0,
    maintenance: 0,
    calibrationDue: 0,
  });
  const { toast } = useToast();

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("name");

      if (error) throw error;

      const equipmentData = (data || []) as Equipment[];
      setEquipment(equipmentData);

      // Calculate stats
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      setStats({
        total: equipmentData.length,
        available: equipmentData.filter((e) => e.status === "available").length,
        inService: equipmentData.filter((e) => e.status === "in_service").length,
        maintenance: equipmentData.filter((e) => e.status === "maintenance" || e.status === "calibration").length,
        calibrationDue: equipmentData.filter((e) => {
          if (!e.next_calibration) return false;
          return new Date(e.next_calibration) <= thirtyDaysFromNow;
        }).length,
      });
    } catch (error) {
      console.error("Error fetching equipment:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar equipamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEquipment = async (data: Omit<Equipment, "id" | "created_at" | "updated_at">) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: newEquipment, error } = await supabase
        .from("equipment")
        .insert({ ...data, created_by: userData.user?.id })
        .select()
        .single();

      if (error) throw error;

      await logActivity({
        action: "created",
        module: "inventory",
        entityType: "equipment",
        entityId: newEquipment.id,
        description: `Equipamento "${data.name}" cadastrado`,
        metadata: { code: data.code, category: data.category },
      });

      toast({ title: "Sucesso", description: "Equipamento cadastrado com sucesso" });
      fetchEquipment();
      return newEquipment;
    } catch (error: any) {
      console.error("Error creating equipment:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao cadastrar equipamento",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateEquipment = async (id: string, data: Partial<Equipment>) => {
    try {
      const { error } = await supabase
        .from("equipment")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      await logActivity({
        action: "updated",
        module: "inventory",
        entityType: "equipment",
        entityId: id,
        description: `Equipamento atualizado`,
        metadata: data,
      });

      toast({ title: "Sucesso", description: "Equipamento atualizado" });
      fetchEquipment();
    } catch (error: any) {
      console.error("Error updating equipment:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar equipamento",
        variant: "destructive",
      });
    }
  };

  const deleteEquipment = async (id: string) => {
    try {
      const equipmentToDelete = equipment.find((e) => e.id === id);
      const { error } = await supabase.from("equipment").delete().eq("id", id);

      if (error) throw error;

      await logActivity({
        action: "deleted",
        module: "inventory",
        entityType: "equipment",
        entityId: id,
        description: `Equipamento "${equipmentToDelete?.name}" removido`,
      });

      toast({ title: "Sucesso", description: "Equipamento removido" });
      fetchEquipment();
    } catch (error: any) {
      console.error("Error deleting equipment:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao remover equipamento",
        variant: "destructive",
      });
    }
  };

  const checkoutEquipment = async (
    equipmentId: string,
    serviceId: string | null,
    condition: EquipmentCondition,
    destination: string,
    notes?: string
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Create allocation record
      const { error: allocationError } = await supabase
        .from("equipment_allocations")
        .insert({
          equipment_id: equipmentId,
          service_id: serviceId,
          checked_out_by: userData.user.id,
          condition_on_checkout: condition,
          checkout_notes: notes,
          destination,
        });

      if (allocationError) throw allocationError;

      // Update equipment status
      const { error: updateError } = await supabase
        .from("equipment")
        .update({
          status: "in_service",
          current_service_id: serviceId,
          current_location: destination,
        })
        .eq("id", equipmentId);

      if (updateError) throw updateError;

      const equipmentItem = equipment.find((e) => e.id === equipmentId);
      await logActivity({
        action: "updated",
        module: "inventory",
        entityType: "equipment",
        entityId: equipmentId,
        description: `Check-out: "${equipmentItem?.name}" para ${destination}`,
        metadata: { serviceId, destination, condition },
      });

      toast({ title: "Sucesso", description: "Check-out realizado com sucesso" });
      fetchEquipment();
    } catch (error: any) {
      console.error("Error checking out equipment:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao realizar check-out",
        variant: "destructive",
      });
    }
  };

  const checkinEquipment = async (
    equipmentId: string,
    condition: EquipmentCondition,
    notes?: string
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Find the active allocation
      const { data: activeAllocation, error: findError } = await supabase
        .from("equipment_allocations")
        .select("*")
        .eq("equipment_id", equipmentId)
        .is("checkin_date", null)
        .order("checkout_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) throw findError;

      if (activeAllocation) {
        // Update allocation with checkin info
        const { error: allocationError } = await supabase
          .from("equipment_allocations")
          .update({
            checkin_date: new Date().toISOString(),
            checked_in_by: userData.user.id,
            condition_on_checkin: condition,
            checkin_notes: notes,
          })
          .eq("id", activeAllocation.id);

        if (allocationError) throw allocationError;
      }

      // Update equipment status
      const { error: updateError } = await supabase
        .from("equipment")
        .update({
          status: "available",
          condition,
          current_service_id: null,
          current_location: "Base",
        })
        .eq("id", equipmentId);

      if (updateError) throw updateError;

      const equipmentItem = equipment.find((e) => e.id === equipmentId);
      await logActivity({
        action: "updated",
        module: "inventory",
        entityType: "equipment",
        entityId: equipmentId,
        description: `Check-in: "${equipmentItem?.name}" retornou à base`,
        metadata: { condition },
      });

      toast({ title: "Sucesso", description: "Check-in realizado com sucesso" });
      fetchEquipment();
    } catch (error: any) {
      console.error("Error checking in equipment:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao realizar check-in",
        variant: "destructive",
      });
    }
  };

  const fetchAllocations = async (equipmentId: string): Promise<EquipmentAllocation[]> => {
    try {
      const { data, error } = await supabase
        .from("equipment_allocations")
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("checkout_date", { ascending: false });

      if (error) throw error;
      return (data || []) as EquipmentAllocation[];
    } catch (error) {
      console.error("Error fetching allocations:", error);
      return [];
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  return {
    equipment,
    loading,
    stats,
    fetchEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    checkoutEquipment,
    checkinEquipment,
    fetchAllocations,
  };
};
