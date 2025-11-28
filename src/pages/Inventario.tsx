import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Plus, Trash2, Save, AlertTriangle, Download, Search } from "lucide-react";
import { exportToExcel } from "@/utils/exportUtils";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";

interface InventoryItem {
  id: string;
  item_name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  location: string | null;
  min_quantity: number | null;
  notes: string | null;
}

const Inventario = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    item_name: "",
    category: "",
    quantity: 0,
    unit: "",
    location: "",
    min_quantity: 0,
    notes: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const filtered = items.filter(item =>
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [items, searchTerm]);

  const handleExport = () => {
    const exportData = filteredItems.map(i => ({
      'Item': i.item_name,
      'Categoria': i.category || '',
      'Quantidade': i.quantity,
      'Unidade': i.unit || '',
      'Localização': i.location || '',
      'Qtd. Mínima': i.min_quantity || '',
      'Observações': i.notes || '',
    }));
    exportToExcel(exportData, `inventario_${new Date().toISOString().split('T')[0]}`, 'Inventário');
  };

  useKeyboardShortcuts([
    { key: 'e', ctrl: true, callback: handleExport, description: 'Exportar inventário' },
  ]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("item_name");

    if (!error && data) {
      setItems(data);
    }
  };

  const addItem = async () => {
    if (!newItem.item_name?.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira o nome do item",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("inventory").insert({
      ...newItem,
      updated_by: user?.id,
    } as any);

    if (error) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item adicionado",
      description: "Item foi adicionado ao inventário",
    });

    setNewItem({
      item_name: "",
      category: "",
      quantity: 0,
      unit: "",
      location: "",
      min_quantity: 0,
      notes: "",
    });
    setIsDialogOpen(false);
    fetchItems();
  };

  const updateItem = async (item: InventoryItem) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("inventory")
      .update({
        ...item,
        last_updated: new Date().toISOString(),
        updated_by: user?.id,
      } as any)
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item atualizado",
      description: "As alterações foram salvas",
    });

    setEditingItem(null);
    fetchItems();
  };

  const confirmDeleteItem = async () => {
    if (!deleteItemId) return;

    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", deleteItemId);

    if (error) {
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item removido",
      description: "Item foi removido do inventário",
    });

    setDeleteItemId(null);
    fetchItems();
  };

  const isLowStock = (item: InventoryItem) => {
    return item.min_quantity && item.quantity <= item.min_quantity;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Inventário / Almoxarife
          </h1>
          <p className="text-muted-foreground">
            Controle de itens e consumíveis disponíveis na base
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Itens do Inventário</CardTitle>
                <CardDescription>
                  Gerencie todos os itens e consumíveis da base
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={filteredItems.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
...
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por item, categoria ou localização..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Qtd. Mínima</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum item no inventário. Adicione o primeiro item acima.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id} className={isLowStock(item) ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isLowStock(item) && (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            {editingItem?.id === item.id ? (
                              <Input
                                value={editingItem.item_name}
                                onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                                className="h-8"
                              />
                            ) : (
                              item.item_name
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingItem?.id === item.id ? (
                            <Input
                              value={editingItem.category || ""}
                              onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            item.category || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {editingItem?.id === item.id ? (
                            <Input
                              type="number"
                              value={editingItem.quantity}
                              onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 0 })}
                              className="h-8 w-20"
                            />
                          ) : (
                            item.quantity
                          )}
                        </TableCell>
                        <TableCell>
                          {editingItem?.id === item.id ? (
                            <Input
                              value={editingItem.unit || ""}
                              onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                              className="h-8 w-16"
                            />
                          ) : (
                            item.unit || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {editingItem?.id === item.id ? (
                            <Input
                              value={editingItem.location || ""}
                              onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            item.location || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {editingItem?.id === item.id ? (
                            <Input
                              type="number"
                              value={editingItem.min_quantity || ""}
                              onChange={(e) => setEditingItem({ ...editingItem, min_quantity: parseInt(e.target.value) || 0 })}
                              className="h-8 w-20"
                            />
                          ) : (
                            item.min_quantity || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {editingItem?.id === item.id ? (
                            <Input
                              value={editingItem.notes || ""}
                              onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            item.notes || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {editingItem?.id === item.id ? (
                              <>
                                <Button size="sm" onClick={() => updateItem(editingItem)}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                  Cancelar
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setEditingItem(item)}>
                                  Editar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setDeleteItemId(item.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este item do inventário? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Inventario;