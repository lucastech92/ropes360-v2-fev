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

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", id);

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
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Item</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do novo item do inventário
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome do Item *</Label>
                      <Input
                        id="name"
                        value={newItem.item_name}
                        onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Input
                          id="category"
                          value={newItem.category || ""}
                          onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="location">Localização</Label>
                        <Input
                          id="location"
                          value={newItem.location || ""}
                          onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="quantity">Quantidade</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="unit">Unidade</Label>
                        <Input
                          id="unit"
                          value={newItem.unit || ""}
                          onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                          placeholder="ex: un, kg, L"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="min">Qtd. Mínima</Label>
                        <Input
                          id="min"
                          type="number"
                          value={newItem.min_quantity || ""}
                          onChange={(e) => setNewItem({ ...newItem, min_quantity: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Input
                        id="notes"
                        value={newItem.notes || ""}
                        onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={addItem}>Adicionar Item</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
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
                                <Button size="sm" variant="outline" onClick={() => deleteItem(item.id)}>
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
      </main>
    </div>
  );
};

export default Inventario;