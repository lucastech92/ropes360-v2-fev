import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Trash2, Edit, MinusCircle, PlusCircle, PackagePlus, PackageMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string | null;
}

interface ChecklistItem {
  id: string;
  item_text: string;
  is_checked: boolean;
  order_index: number;
  target_quantity: number;
  current_quantity: number;
  inventory_item_id: string | null;
}

interface Checklist {
  id: string;
  name: string;
  description: string | null;
  service_tag: string | null;
  checklist_type: 'entrada' | 'saida';
  items?: ChecklistItem[];
}

const CheckList = () => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [newChecklistDescription, setNewChecklistDescription] = useState("");
  const [newChecklistServiceTag, setNewChecklistServiceTag] = useState("");
  const [newChecklistType, setNewChecklistType] = useState<'entrada' | 'saida'>('saida');
  const { toast } = useToast();

  useEffect(() => {
    fetchChecklists();
    fetchInventoryItems();
  }, []);

  useEffect(() => {
    if (selectedChecklist) {
      fetchChecklistItems(selectedChecklist);
    }
  }, [selectedChecklist]);

  const fetchInventoryItems = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("id, item_name, quantity, unit")
      .order("item_name");

    if (!error && data) {
      setInventoryItems(data);
    }
  };

  const fetchChecklists = async () => {
    const { data, error } = await supabase
      .from("checklists")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setChecklists(data as Checklist[]);
      if (data.length > 0 && !selectedChecklist) {
        setSelectedChecklist(data[0].id);
      }
    }
  };

  const fetchChecklistItems = async (checklistId: string) => {
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("checklist_id", checklistId)
      .order("order_index");

    if (!error && data) {
      setItems(data);
    }
  };

  const updateItemQuantity = async (itemId: string, delta: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = Math.max(0, Math.min(item.target_quantity, item.current_quantity + delta));
    
    const { error } = await supabase
      .from("checklist_items")
      .update({ 
        current_quantity: newQuantity,
        is_checked: newQuantity === item.target_quantity 
      })
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a quantidade",
        variant: "destructive",
      });
      return;
    }

    setItems(items.map(i => 
      i.id === itemId 
        ? { ...i, current_quantity: newQuantity, is_checked: newQuantity === item.target_quantity } 
        : i
    ));
    
    await fetchInventoryItems();
  };

  const addItem = async () => {
    if (!selectedInventoryItem || !selectedChecklist) {
      toast({
        title: "Erro",
        description: "Selecione um item do inventário",
        variant: "destructive",
      });
      return;
    }

    const inventoryItem = inventoryItems.find(i => i.id === selectedInventoryItem);
    if (!inventoryItem) return;

    const maxOrder = Math.max(...items.map(i => i.order_index), 0);

    const { data, error } = await supabase
      .from("checklist_items")
      .insert({
        checklist_id: selectedChecklist,
        item_text: inventoryItem.item_name,
        order_index: maxOrder + 1,
        target_quantity: newItemQuantity,
        current_quantity: 0,
        inventory_item_id: selectedInventoryItem,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o item",
        variant: "destructive",
      });
      return;
    }

    setItems([...items, data]);
    setSelectedInventoryItem("");
    setNewItemQuantity(1);
    await fetchInventoryItems();
    toast({
      title: "Item adicionado",
      description: "Item adicionado e estoque atualizado automaticamente",
    });
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from("checklist_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o item",
        variant: "destructive",
      });
      return;
    }

    setItems(items.filter(item => item.id !== itemId));
    await fetchInventoryItems();
    toast({
      title: "Item removido",
      description: "Item removido e estoque atualizado automaticamente",
    });
  };

  const createChecklist = async () => {
    if (!newChecklistName.trim()) return;

    const { data, error } = await supabase
      .from("checklists")
      .insert({
        name: newChecklistName,
        description: newChecklistDescription || null,
        service_tag: newChecklistServiceTag || null,
        checklist_type: newChecklistType,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o checklist",
        variant: "destructive",
      });
      return;
    }

    setChecklists([data as Checklist, ...checklists]);
    setSelectedChecklist(data.id);
    setNewChecklistName("");
    setNewChecklistDescription("");
    setNewChecklistServiceTag("");
    setNewChecklistType('saida');
    setIsCreateDialogOpen(false);
    toast({
      title: "Checklist criado",
      description: "Novo modelo de checklist criado com sucesso",
    });
  };

  const updateChecklist = async () => {
    if (!selectedChecklist || !currentChecklist) return;

    const { error } = await supabase
      .from("checklists")
      .update({
        name: newChecklistName,
        description: newChecklistDescription || null,
        service_tag: newChecklistServiceTag || null,
        checklist_type: newChecklistType,
      })
      .eq("id", selectedChecklist);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o checklist",
        variant: "destructive",
      });
      return;
    }

    await fetchChecklists();
    setIsEditDialogOpen(false);
    toast({
      title: "Checklist atualizado",
      description: "Modelo de checklist atualizado com sucesso",
    });
  };

  const openEditDialog = () => {
    if (currentChecklist) {
      setNewChecklistName(currentChecklist.name);
      setNewChecklistDescription(currentChecklist.description || "");
      setNewChecklistServiceTag(currentChecklist.service_tag || "");
      setNewChecklistType(currentChecklist.checklist_type);
      setIsEditDialogOpen(true);
    }
  };

  const currentChecklist = checklists.find(c => c.id === selectedChecklist);
  const completedCount = items.filter(i => i.is_checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Check List
          </h1>
          <p className="text-muted-foreground">
            Checklists com controle automático de inventário - itens de entrada/saída sincronizados com o estoque
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Selecionar Checklist</CardTitle>
                  <CardDescription>
                    Escolha um checklist para visualizar e preencher
                  </CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Checklist
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Checklist</DialogTitle>
                      <DialogDescription>
                        Crie um novo modelo de checklist para uso posterior
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nome*</Label>
                        <Input
                          id="name"
                          value={newChecklistName}
                          onChange={(e) => setNewChecklistName(e.target.value)}
                          placeholder="Nome do checklist"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Tipo*</Label>
                        <Select value={newChecklistType} onValueChange={(value: 'entrada' | 'saida') => setNewChecklistType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entrada">
                              <div className="flex items-center gap-2">
                                <PackagePlus className="h-4 w-4" />
                                Checklist de Entrada (adiciona ao estoque)
                              </div>
                            </SelectItem>
                            <SelectItem value="saida">
                              <div className="flex items-center gap-2">
                                <PackageMinus className="h-4 w-4" />
                                Checklist de Saída (retira do estoque)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={newChecklistDescription}
                          onChange={(e) => setNewChecklistDescription(e.target.value)}
                          placeholder="Descrição opcional"
                        />
                      </div>
                      <div>
                        <Label htmlFor="service_tag">Tag de Serviço</Label>
                        <Input
                          id="service_tag"
                          value={newChecklistServiceTag}
                          onChange={(e) => setNewChecklistServiceTag(e.target.value)}
                          placeholder="Tag opcional"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={createChecklist}>Criar Checklist</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedChecklist || undefined} onValueChange={setSelectedChecklist}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um checklist" />
                </SelectTrigger>
                <SelectContent>
                  {checklists.map((checklist) => (
                    <SelectItem key={checklist.id} value={checklist.id}>
                      {checklist.name} {checklist.service_tag && `(${checklist.service_tag})`} - {checklist.checklist_type === 'entrada' ? 'Entrada' : 'Saída'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedChecklist && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" onClick={openEditDialog}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Checklist Atual
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Checklist</DialogTitle>
                      <DialogDescription>
                        Atualize as informações deste modelo de checklist
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-name">Nome*</Label>
                        <Input
                          id="edit-name"
                          value={newChecklistName}
                          onChange={(e) => setNewChecklistName(e.target.value)}
                          placeholder="Nome do checklist"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-type">Tipo*</Label>
                        <Select value={newChecklistType} onValueChange={(value: 'entrada' | 'saida') => setNewChecklistType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entrada">
                              <div className="flex items-center gap-2">
                                <PackagePlus className="h-4 w-4" />
                                Checklist de Entrada (adiciona ao estoque)
                              </div>
                            </SelectItem>
                            <SelectItem value="saida">
                              <div className="flex items-center gap-2">
                                <PackageMinus className="h-4 w-4" />
                                Checklist de Saída (retira do estoque)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="edit-description">Descrição</Label>
                        <Textarea
                          id="edit-description"
                          value={newChecklistDescription}
                          onChange={(e) => setNewChecklistDescription(e.target.value)}
                          placeholder="Descrição opcional"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-service_tag">Tag de Serviço</Label>
                        <Input
                          id="edit-service_tag"
                          value={newChecklistServiceTag}
                          onChange={(e) => setNewChecklistServiceTag(e.target.value)}
                          placeholder="Tag opcional"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={updateChecklist}>Salvar Alterações</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {currentChecklist && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{currentChecklist.name}</CardTitle>
                      <span className={`text-sm font-semibold px-2 py-1 rounded flex items-center gap-1 ${
                        currentChecklist.checklist_type === 'entrada' 
                          ? 'bg-green-500/10 text-green-600' 
                          : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {currentChecklist.checklist_type === 'entrada' ? (
                          <>
                            <PackagePlus className="h-3 w-3" />
                            Entrada
                          </>
                        ) : (
                          <>
                            <PackageMinus className="h-3 w-3" />
                            Saída
                          </>
                        )}
                      </span>
                    </div>
                    {currentChecklist.description && (
                      <CardDescription className="mt-2">
                        {currentChecklist.description}
                      </CardDescription>
                    )}
                    {currentChecklist.service_tag && (
                      <div className="mt-2">
                        <span className="text-sm font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                          Tag: {currentChecklist.service_tag}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{progress}%</div>
                    <div className="text-sm text-muted-foreground">
                      {completedCount}/{totalCount} completos
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <Checkbox
                      checked={item.is_checked}
                      disabled
                    />
                    <span className={item.is_checked ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                      {item.item_text}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateItemQuantity(item.id, -1)}
                        disabled={item.current_quantity === 0}
                      >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-semibold min-w-[60px] text-center">
                        {item.current_quantity}/{item.target_quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateItemQuantity(item.id, 1)}
                        disabled={item.current_quantity === item.target_quantity}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2 pt-4 border-t">
                  <Select value={selectedInventoryItem} onValueChange={setSelectedInventoryItem}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar item do inventário" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.item_name} - Disponível: {item.quantity} {item.unit || 'un'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="quantity" className="text-sm whitespace-nowrap">Qtd:</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20"
                    />
                  </div>
                  <Button onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default CheckList;
