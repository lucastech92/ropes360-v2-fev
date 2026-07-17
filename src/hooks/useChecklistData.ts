import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  physical_quantity: number;
  reserved_quantity: number;
  reserved_for_service: number;
  available_quantity: number;
  unit: string | null;
  status: string | null;
  next_calibration: string | null;
}

export interface ChecklistItem {
  id: string;
  item_text: string;
  is_checked: boolean;
  order_index: number;
  target_quantity: number;
  current_quantity: number;
  inventory_item_id: string | null;
}

export interface Checklist {
  id: string;
  name: string;
  description: string | null;
  service_tag: string | null;
  checklist_type: 'entrada' | 'saida';
  is_template: boolean;
  is_saved: boolean;
  saved_at: string | null;
  items?: ChecklistItem[];
}

export interface ChecklistFormData {
  name: string;
  description: string;
  serviceTag: string;
  type: 'entrada' | 'saida';
  isTemplate: boolean;
}

export const useChecklistData = (serviceId?: string | null) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [linkedChecklistIds, setLinkedChecklistIds] = useState<string[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const { toast } = useToast();

  const templates = checklists.filter(c => c.is_template && !c.is_saved);
  const serviceChecklists = checklists.filter(c =>
    !c.is_template && (serviceId ? linkedChecklistIds.includes(c.id) : !c.is_saved)
  );
  const savedChecklists = serviceId ? [] : checklists.filter(c => c.is_saved && !c.is_template);
  const currentChecklist = checklists.find(c => c.id === selectedChecklist);
  const completedCount = items.filter(i => i.is_checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    fetchChecklists();
  }, []);

  useEffect(() => {
    fetchInventoryItems();
  }, [serviceId]);

  useEffect(() => {
    const fetchLinkedChecklists = async () => {
      if (!serviceId) {
        setLinkedChecklistIds([]);
        return;
      }
      const { data } = await supabase
        .from("service_checklists")
        .select("checklist_id")
        .eq("service_id", serviceId);
      const ids = (data ?? []).map((item) => item.checklist_id);
      setLinkedChecklistIds(ids);
      if (ids.length > 0) setSelectedChecklist((current) => current && ids.includes(current) ? current : ids[0]);
    };
    fetchLinkedChecklists();
  }, [serviceId]);

  useEffect(() => {
    if (selectedChecklist) {
      fetchChecklistItems(selectedChecklist);
    }
  }, [selectedChecklist]);

  const fetchInventoryItems = async () => {
    const { data, error } = await (supabase as any).rpc("get_inventory_stock_availability", {
      p_service_id: serviceId ?? null,
    });

    if (!error && data) {
      setInventoryItems(data as InventoryItem[]);
    } else if (error) {
      toast({
        title: "Não foi possível carregar a disponibilidade",
        description: error.message,
        variant: "destructive",
      });
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
        const nonTemplate = data.find(c => !c.is_template);
        if (nonTemplate) {
          setSelectedChecklist(nonTemplate.id);
        }
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

  const addItem = async (inventoryItemId: string, quantity: number) => {
    if (!inventoryItemId || !selectedChecklist) {
      toast({
        title: "Erro",
        description: "Selecione um item do inventário",
        variant: "destructive",
      });
      return false;
    }

    const inventoryItem = inventoryItems.find(i => i.id === inventoryItemId);
    if (!inventoryItem) return false;

    const maxOrder = Math.max(...items.map(i => i.order_index), 0);

    const { data, error } = await supabase
      .from("checklist_items")
      .insert({
        checklist_id: selectedChecklist,
        item_text: inventoryItem.item_name,
        order_index: maxOrder + 1,
        target_quantity: quantity,
        current_quantity: 0,
        inventory_item_id: inventoryItemId,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Não foi possível baixar o item",
        description: error.message.includes("Insufficient stock")
          ? "Não há saldo suficiente no inventário. Atualize o estoque ou reduza a quantidade."
          : error.message,
        variant: "destructive",
      });
      return false;
    }

    setItems([...items, data]);
    await fetchInventoryItems();
    toast({
      title: "Item adicionado",
      description: serviceId
        ? "Quantidade baixada imediatamente do inventário para este JBR."
        : "Item adicionado ao checklist. A baixa ocorrerá quando ele for vinculado a um JBR.",
    });
    return true;
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
      return false;
    }

    setItems(items.filter(item => item.id !== itemId));
    await fetchInventoryItems();
    toast({
      title: "Item removido",
      description: serviceId
        ? "Item removido e quantidade devolvida ao inventário."
        : "Item removido do checklist.",
    });
    return true;
  };

  const createChecklist = async (formData: ChecklistFormData, selectedServiceId?: string | null, selectedContainerId?: string | null) => {
    if (!formData.name.trim()) return null;

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("checklists")
      .insert({
        name: formData.name,
        description: formData.description || null,
        service_tag: formData.isTemplate ? null : (formData.serviceTag || null),
        checklist_type: formData.type,
        is_template: formData.isTemplate,
        created_by: userData?.user?.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o checklist",
        variant: "destructive",
      });
      return null;
    }

    if (selectedServiceId && !formData.isTemplate) {
      await supabase.from("service_checklists").insert({
        service_id: selectedServiceId,
        checklist_id: data.id,
      });
      if (selectedContainerId) {
        const { error: containerError } = await supabase.rpc("assign_service_container", { p_service_id: selectedServiceId, p_container_id: selectedContainerId });
        if (containerError) toast({ title: "Checklist criado", description: "O container não pôde ser reservado: " + containerError.message, variant: "destructive" });
      }
    }

    setChecklists([data as Checklist, ...checklists]);
    setSelectedChecklist(data.id);
    toast({
      title: formData.isTemplate ? "Template criado" : "Checklist criado",
      description: formData.isTemplate 
        ? "Novo template criado. Adicione itens e use-o para clonar novos checklists."
        : selectedServiceId 
          ? "Novo checklist criado e vinculado ao serviço."
          : "Novo checklist criado com sucesso",
    });
    return data;
  };

  const updateChecklist = async (formData: ChecklistFormData, selectedServiceId?: string | null, selectedContainerId?: string | null) => {
    if (!selectedChecklist) return false;

    const { error } = await supabase
      .from("checklists")
      .update({
        name: formData.name,
        description: formData.description || null,
        service_tag: formData.isTemplate ? null : (formData.serviceTag || null),
        checklist_type: formData.type,
        is_template: formData.isTemplate,
      })
      .eq("id", selectedChecklist);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o checklist",
        variant: "destructive",
      });
      return false;
    }

    // Handle service link: remove old links and add new one if selected
    if (!formData.isTemplate) {
      await supabase
        .from("service_checklists")
        .delete()
        .eq("checklist_id", selectedChecklist);

      if (selectedServiceId) {
        await supabase.from("service_checklists").insert({
          service_id: selectedServiceId,
          checklist_id: selectedChecklist,
        });
        if (selectedContainerId) {
          const { error: containerError } = await supabase.rpc("assign_service_container", { p_service_id: selectedServiceId, p_container_id: selectedContainerId });
          if (containerError) toast({ title: "Checklist atualizado", description: "O container não pôde ser reservado: " + containerError.message, variant: "destructive" });
        }
      }
    }

    await fetchChecklists();
    toast({
      title: "Checklist atualizado",
      description: "Checklist atualizado com sucesso",
    });
    return true;
  };

  const cloneTemplate = async (template: Checklist, serviceTag: string, newName?: string, serviceId?: string, containerId?: string) => {
    const { data: userData } = await supabase.auth.getUser();

    const { data: newChecklist, error: checklistError } = await supabase
      .from("checklists")
      .insert({
        name: newName || template.name,
        description: template.description,
        service_tag: serviceTag.trim() || null,
        checklist_type: template.checklist_type,
        is_template: false,
        created_by: userData?.user?.id,
      })
      .select()
      .single();

    if (checklistError || !newChecklist) {
      toast({
        title: "Erro",
        description: "Não foi possível clonar o template",
        variant: "destructive",
      });
      return null;
    }

    const { data: templateItems, error: itemsError } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("checklist_id", template.id)
      .order("order_index");

    if (itemsError) {
      toast({
        title: "Aviso",
        description: "Checklist criado, mas não foi possível copiar os itens do template",
        variant: "destructive",
      });
      return newChecklist;
    }

    if (templateItems && templateItems.length > 0) {
      const clonedItems = templateItems.map(item => ({
        checklist_id: newChecklist.id,
        item_text: item.item_text,
        order_index: item.order_index,
        target_quantity: item.target_quantity,
        current_quantity: 0,
        is_checked: false,
        inventory_item_id: item.inventory_item_id,
      }));

      const { error: insertError } = await supabase
        .from("checklist_items")
        .insert(clonedItems);

      if (insertError) {
        toast({
          title: "Aviso",
          description: "Checklist criado, mas alguns itens não foram copiados",
          variant: "destructive",
        });
      }
    }

    if (serviceId) {
      const { error: linkError } = await supabase.from("service_checklists").insert({
        service_id: serviceId,
        checklist_id: newChecklist.id,
        source_template_id: template.id,
      });
      if (linkError) {
        await supabase.from("checklists").delete().eq("id", newChecklist.id);
        toast({
          title: "Checklist já utilizado",
          description: linkError.code === "23505"
            ? "Este template já foi adicionado ao JBR. Abra o checklist existente."
            : "Não foi possível concluir o vínculo formal com o JBR.",
          variant: "destructive",
        });
        return null;
      }
    }

    if (serviceId && containerId) {
      const { error: containerError } = await supabase.rpc("assign_service_container", { p_service_id: serviceId, p_container_id: containerId });
      if (containerError) toast({ title: "Checklist vinculado", description: "O container não pôde ser reservado: " + containerError.message, variant: "destructive" });
    }

    await fetchChecklists();
    setSelectedChecklist(newChecklist.id);
    
    toast({
      title: "Checklist clonado",
      description: serviceTag ? `Checklist criado para o serviço ${serviceTag} com ${templateItems?.length || 0} itens` : `Checklist independente criado com ${templateItems?.length || 0} itens`,
    });
    
    return newChecklist;
  };

  const saveChecklist = async (checklistId: string) => {
    const { error } = await supabase
      .from("checklists")
      .update({ is_saved: true, saved_at: new Date().toISOString() })
      .eq("id", checklistId);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível salvar o checklist", variant: "destructive" });
      return false;
    }

    if (selectedChecklist === checklistId) {
      setSelectedChecklist(null);
    }
    await fetchChecklists();
    toast({ title: "Checklist salvo", description: "Checklist movido para a aba Salvos" });
    return true;
  };

  const restoreChecklist = async (checklistId: string) => {
    const { error } = await supabase
      .from("checklists")
      .update({ is_saved: false, saved_at: null })
      .eq("id", checklistId);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível restaurar o checklist", variant: "destructive" });
      return false;
    }

    await fetchChecklists();
    toast({ title: "Checklist restaurado", description: "Checklist movido de volta para Serviços" });
    return true;
  };

  const saveAsTemplate = async (checklistId: string) => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return null;

    const { data: userData } = await supabase.auth.getUser();

    const { data: newTemplate, error: templateError } = await supabase
      .from("checklists")
      .insert({
        name: checklist.name + " (Template)",
        description: checklist.description,
        service_tag: null,
        checklist_type: checklist.checklist_type,
        is_template: true,
        is_saved: false,
        created_by: userData?.user?.id,
      })
      .select()
      .single();

    if (templateError || !newTemplate) {
      toast({ title: "Erro", description: "Não foi possível criar o template", variant: "destructive" });
      return null;
    }

    // Copy items
    const { data: sourceItems } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("checklist_id", checklistId)
      .order("order_index");

    if (sourceItems && sourceItems.length > 0) {
      await supabase.from("checklist_items").insert(
        sourceItems.map(item => ({
          checklist_id: newTemplate.id,
          item_text: item.item_text,
          order_index: item.order_index,
          target_quantity: item.target_quantity,
          current_quantity: 0,
          is_checked: false,
          inventory_item_id: item.inventory_item_id,
        }))
      );
    }

    await fetchChecklists();
    toast({ title: "Template criado", description: `Template "${newTemplate.name}" criado com ${sourceItems?.length || 0} itens` });
    return newTemplate;
  };

  return {
    checklists,
    selectedChecklist,
    setSelectedChecklist,
    items,
    inventoryItems,
    templates,
    serviceChecklists,
    savedChecklists,
    currentChecklist,
    completedCount,
    totalCount,
    progress,
    updateItemQuantity,
    addItem,
    deleteItem,
    createChecklist,
    updateChecklist,
    cloneTemplate,
    saveChecklist,
    restoreChecklist,
    saveAsTemplate,
    fetchInventoryItems,
  };
};
