import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useEquipment, Equipment, EquipmentCondition } from "@/hooks/useEquipment";
import EquipmentDashboard from "@/components/equipment/EquipmentDashboard";
import EquipmentList from "@/components/equipment/EquipmentList";
import EquipmentForm from "@/components/equipment/EquipmentForm";
import EquipmentCheckout from "@/components/equipment/EquipmentCheckout";
import EquipmentCheckin from "@/components/equipment/EquipmentCheckin";
import EquipmentDetails from "@/components/equipment/EquipmentDetails";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

const Equipamentos = () => {
  const {
    equipment,
    loading,
    stats,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    checkoutEquipment,
    checkinEquipment,
    fetchAllocations,
  } = useEquipment();

  const [canManage, setCanManage] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);

      const userRoles = roles?.map((r) => r.role) || [];
      setCanManage(userRoles.includes("admin") || userRoles.includes("moderator"));
    };

    checkRole();
  }, []);

  const handleAdd = () => {
    setSelectedEquipment(null);
    setFormOpen(true);
  };

  const handleEdit = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    const eq = equipment.find((e) => e.id === id);
    setSelectedEquipment(eq || null);
    setDeleteDialogOpen(true);
  };

  const handleCheckout = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setCheckoutOpen(true);
  };

  const handleCheckin = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setCheckinOpen(true);
  };

  const handleViewDetails = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setDetailsOpen(true);
  };

  const handleSave = async (data: any) => {
    if (selectedEquipment) {
      await updateEquipment(selectedEquipment.id, data);
    } else {
      await createEquipment(data);
    }
  };

  const confirmDelete = async () => {
    if (selectedEquipment) {
      await deleteEquipment(selectedEquipment.id);
    }
    setDeleteDialogOpen(false);
    setSelectedEquipment(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Equipamentos</h1>
            <p className="text-muted-foreground">
              Controle de equipamentos com rastreamento de alocação
            </p>
          </div>

          <EquipmentDashboard stats={stats} />

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando equipamentos...
            </div>
          ) : (
            <EquipmentList
              equipment={equipment}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCheckout={handleCheckout}
              onCheckin={handleCheckin}
              onViewDetails={handleViewDetails}
              onAdd={handleAdd}
              canManage={canManage}
            />
          )}
        </div>
      </main>

      <EquipmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        equipment={selectedEquipment}
        onSave={handleSave}
      />

      <EquipmentCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        equipment={selectedEquipment}
        onCheckout={checkoutEquipment}
      />

      <EquipmentCheckin
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        equipment={selectedEquipment}
        onCheckin={checkinEquipment}
      />

      <EquipmentDetails
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        equipment={selectedEquipment}
        fetchAllocations={fetchAllocations}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o equipamento "{selectedEquipment?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Equipamentos;
