import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedInventory, UnifiedInventoryItem, EquipmentCondition } from "@/hooks/useUnifiedInventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Wrench, BarChart3, Sparkles, History, Gauge } from "lucide-react";
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
import InventoryDashboard from "@/components/inventory/InventoryDashboard";
import InventoryItemList from "@/components/inventory/InventoryItemList";
import InventoryItemForm from "@/components/inventory/InventoryItemForm";
import InventoryItemDetails from "@/components/inventory/InventoryItemDetails";
import MaintenanceTab from "@/components/inventory/MaintenanceTab";
import UtilizationTab from "@/components/inventory/UtilizationTab";
import { InventoryTrendsAI } from "@/components/inventory/InventoryTrendsAI";
import { InventoryAuditTrail } from "@/components/inventory/InventoryAuditTrail";
import CalibrationTab from "@/components/inventory/CalibrationTab";
import EquipmentCheckout from "@/components/equipment/EquipmentCheckout";
import EquipmentCheckin from "@/components/equipment/EquipmentCheckin";

const Inventario = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'items';
  
  const {
    items,
    loading,
    stats,
    createItem,
    updateItem,
    deleteItem,
    checkoutItem,
    checkinItem,
    fetchAllocations,
    fetchItems,
  } = useUnifiedInventory();

  const [canManage, setCanManage] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UnifiedInventoryItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<UnifiedInventoryItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkItem, setCheckItem] = useState<UnifiedInventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [preselectedMaintenanceItem, setPreselectedMaintenanceItem] = useState<string | null>(null);
  const [preselectedCalibrationItem, setPreselectedCalibrationItem] = useState<string | null>(null);

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
    setSelectedItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: UnifiedInventoryItem) => {
    setSelectedItem(item);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      await deleteItem(itemToDelete);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleSave = async (data: Partial<UnifiedInventoryItem>) => {
    if (selectedItem) {
      return await updateItem(selectedItem.id, data);
    } else {
      return await createItem(data);
    }
  };

  const handleViewDetails = (item: UnifiedInventoryItem) => {
    setDetailsItem(item);
    setDetailsOpen(true);
  };

  const handleCheckout = (item: UnifiedInventoryItem) => {
    setCheckItem(item);
    setCheckoutOpen(true);
  };

  const handleCheckin = (item: UnifiedInventoryItem) => {
    setCheckItem(item);
    setCheckinOpen(true);
  };

  const handleCheckoutSubmit = async (
    equipmentId: string,
    serviceId: string | null,
    condition: EquipmentCondition,
    destination: string,
    notes?: string
  ) => {
    await checkoutItem(equipmentId, destination, serviceId, condition, notes || "");
    setCheckoutOpen(false);
    setCheckItem(null);
  };

  const handleCheckinSubmit = async (
    equipmentId: string,
    condition: EquipmentCondition,
    notes?: string
  ) => {
    // Find open allocation for this item
    const { data } = await supabase
      .from("inventory_allocations")
      .select("id")
      .eq("inventory_item_id", equipmentId)
      .is("checkin_date", null)
      .order("checkout_date", { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      await checkinItem(equipmentId, data.id, condition, notes || "");
    }
    setCheckinOpen(false);
    setCheckItem(null);
  };

  // Handlers for new maintenance/calibration from item details
  const handleNewMaintenanceFromDetails = (item: UnifiedInventoryItem) => {
    setPreselectedMaintenanceItem(item.id);
    setActiveTab("maintenance");
  };

  const handleNewCalibrationFromDetails = (item: UnifiedInventoryItem) => {
    setPreselectedCalibrationItem(item.id);
    setActiveTab("calibration");
  };

  const equipmentItems = items.filter((i) => i.item_type === "equipamento");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              Inventário / Almoxarifado
            </h1>
            <p className="text-muted-foreground">
              Gestão unificada de consumíveis, equipamentos e manutenções
            </p>
          </div>

          <InventoryDashboard stats={stats} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-4xl grid-cols-6">
              <TabsTrigger value="items" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Itens
              </TabsTrigger>
              <TabsTrigger value="calibration" className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Calibrações
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Manutenções
              </TabsTrigger>
              <TabsTrigger value="utilization" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Utilização
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                IA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="mt-6">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Carregando itens...
                </div>
              ) : (
                <InventoryItemList
                  items={items}
                  onAdd={handleAdd}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCheckout={handleCheckout}
                  onCheckin={handleCheckin}
                  onViewDetails={handleViewDetails}
                  canManage={canManage}
                />
              )}
            </TabsContent>

            <TabsContent value="calibration" className="mt-6">
              <CalibrationTab 
                items={items} 
                onRefresh={fetchItems}
                preSelectedItemId={preselectedCalibrationItem}
                onClearPreselection={() => setPreselectedCalibrationItem(null)}
              />
            </TabsContent>

            <TabsContent value="maintenance" className="mt-6">
              <MaintenanceTab 
                equipmentItems={equipmentItems} 
                canManage={canManage}
                preSelectedItemId={preselectedMaintenanceItem}
                onClearPreselection={() => setPreselectedMaintenanceItem(null)}
              />
            </TabsContent>

            <TabsContent value="utilization" className="mt-6">
              <UtilizationTab items={items} />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <InventoryAuditTrail />
            </TabsContent>

            <TabsContent value="trends" className="mt-6">
              <InventoryTrendsAI />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <InventoryItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={selectedItem}
        onSave={handleSave}
      />

      <InventoryItemDetails
        item={detailsItem}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={(item) => {
          setDetailsOpen(false);
          handleEdit(item);
        }}
        onCheckout={handleCheckout}
        onCheckin={handleCheckin}
        canManage={canManage}
        onNewMaintenance={handleNewMaintenanceFromDetails}
        onNewCalibration={handleNewCalibrationFromDetails}
      />

      {checkItem && (
        <>
          <EquipmentCheckout
            open={checkoutOpen}
            onOpenChange={setCheckoutOpen}
            equipment={{
              id: checkItem.id,
              code: checkItem.code || "",
              name: checkItem.item_name,
              category: checkItem.category || "",
              status: checkItem.status || "available",
              condition: checkItem.condition || "good",
              current_location: checkItem.current_location || null,
              manufacturer: checkItem.manufacturer || null,
              model: checkItem.model || null,
              serial_number: checkItem.serial_number || null,
              acquisition_date: checkItem.acquisition_date || null,
              last_calibration: checkItem.last_calibration || null,
              next_calibration: checkItem.next_calibration || null,
              calibration_interval_months: checkItem.calibration_interval_months || null,
              notes: checkItem.notes || null,
              photo_url: checkItem.photo_url || null,
              created_at: null,
              updated_at: null,
              created_by: null,
              current_service_id: null,
              inventory_item_id: checkItem.id,
            }}
            onCheckout={handleCheckoutSubmit}
          />
          <EquipmentCheckin
            open={checkinOpen}
            onOpenChange={setCheckinOpen}
            equipment={{
              id: checkItem.id,
              code: checkItem.code || "",
              name: checkItem.item_name,
              category: checkItem.category || "",
              status: checkItem.status || "available",
              condition: checkItem.condition || "good",
              current_location: checkItem.current_location || null,
              manufacturer: checkItem.manufacturer || null,
              model: checkItem.model || null,
              serial_number: checkItem.serial_number || null,
              acquisition_date: checkItem.acquisition_date || null,
              last_calibration: checkItem.last_calibration || null,
              next_calibration: checkItem.next_calibration || null,
              calibration_interval_months: checkItem.calibration_interval_months || null,
              notes: checkItem.notes || null,
              photo_url: checkItem.photo_url || null,
              created_at: null,
              updated_at: null,
              created_by: null,
              current_service_id: null,
              inventory_item_id: checkItem.id,
            }}
            onCheckin={handleCheckinSubmit}
          />
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
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

export default Inventario;
