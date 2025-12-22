import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedInventory, UnifiedInventoryItem } from "@/hooks/useUnifiedInventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Wrench, BarChart3, Sparkles, History } from "lucide-react";
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
import MaintenanceTab from "@/components/inventory/MaintenanceTab";
import UtilizationTab from "@/components/inventory/UtilizationTab";
import { InventoryTrendsAI } from "@/components/inventory/InventoryTrendsAI";
import { InventoryAuditTrail } from "@/components/inventory/InventoryAuditTrail";

const Inventario = () => {
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
  } = useUnifiedInventory();

  const [canManage, setCanManage] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UnifiedInventoryItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

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
              Gestão unificada de consumíveis e equipamentos
            </p>
          </div>

          <InventoryDashboard stats={stats} />

          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full max-w-3xl grid-cols-5">
              <TabsTrigger value="items" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Itens
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
                Tendências IA
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
                  canManage={canManage}
                />
              )}
            </TabsContent>

            <TabsContent value="maintenance" className="mt-6">
              <MaintenanceTab equipmentItems={equipmentItems} canManage={canManage} />
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
