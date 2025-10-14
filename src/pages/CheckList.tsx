import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChecklistItem {
  id: string;
  item_text: string;
  is_checked: boolean;
  order_index: number;
}

interface Checklist {
  id: string;
  name: string;
  description: string | null;
  service_tag: string | null;
  items?: ChecklistItem[];
}

const CheckList = () => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchChecklists();
  }, []);

  useEffect(() => {
    if (selectedChecklist) {
      fetchChecklistItems(selectedChecklist);
    }
  }, [selectedChecklist]);

  const fetchChecklists = async () => {
    const { data, error } = await supabase
      .from("checklists")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setChecklists(data);
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

  const toggleItem = async (itemId: string, currentState: boolean) => {
    const { error } = await supabase
      .from("checklist_items")
      .update({ is_checked: !currentState })
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o item",
        variant: "destructive",
      });
      return;
    }

    setItems(items.map(item => 
      item.id === itemId ? { ...item, is_checked: !currentState } : item
    ));
  };

  const addItem = async () => {
    if (!newItemText.trim() || !selectedChecklist) return;

    const maxOrder = Math.max(...items.map(i => i.order_index), 0);

    const { data, error } = await supabase
      .from("checklist_items")
      .insert({
        checklist_id: selectedChecklist,
        item_text: newItemText,
        order_index: maxOrder + 1,
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
    setNewItemText("");
    toast({
      title: "Item adicionado",
      description: "Novo item foi adicionado ao checklist",
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
    toast({
      title: "Item removido",
      description: "Item foi removido do checklist",
    });
  };

  const saveChecklist = () => {
    toast({
      title: "Checklist salvo",
      description: "Todas as alterações foram salvas automaticamente",
    });
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
            Checklists para montagem de containers e verificação de ferramentas
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Checklist</CardTitle>
              <CardDescription>
                Escolha um checklist para visualizar e preencher
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedChecklist || undefined} onValueChange={setSelectedChecklist}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um checklist" />
                </SelectTrigger>
                <SelectContent>
                  {checklists.map((checklist) => (
                    <SelectItem key={checklist.id} value={checklist.id}>
                      {checklist.name} {checklist.service_tag && `(${checklist.service_tag})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {currentChecklist && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{currentChecklist.name}</CardTitle>
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
                      onCheckedChange={() => toggleItem(item.id, item.is_checked)}
                    />
                    <span className={item.is_checked ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                      {item.item_text}
                    </span>
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
                  <Input
                    placeholder="Adicionar novo item..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItem()}
                  />
                  <Button onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>

                <Button onClick={saveChecklist} className="w-full" variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default CheckList;