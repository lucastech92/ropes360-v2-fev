import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardList, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceChecklistsSelect } from "@/components/service/ServiceChecklistsSelect";
import { useToast } from "@/hooks/use-toast";
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

interface ChecklistSummary {
  id: string;
  name: string;
  description: string | null;
  checklist_type: string;
  itemCount: number;
  completedCount: number;
}

export const ServiceChecklistsPanel = ({ serviceId, jbrCode, canRemove = false, onChanged }: { serviceId: string; jbrCode: string; canRemove?: boolean; onChanged?: () => void }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [cloning, setCloning] = useState(false);
  const [usedTemplateIds, setUsedTemplateIds] = useState<string[]>([]);
  const [linkedChecklistNames, setLinkedChecklistNames] = useState<string[]>([]);
  const [checklistToRemove, setChecklistToRemove] = useState<ChecklistSummary | null>(null);
  const [removingChecklistId, setRemovingChecklistId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("service_checklists")
        .select("checklist_id, source_template_id, checklists:checklist_id(id, name, description, checklist_type, checklist_items(id, is_checked))")
        .eq("service_id", serviceId);

      const summaries = (data ?? []).flatMap((link: any) => {
        const checklist = link.checklists;
        if (!checklist) return [];
        const items = checklist.checklist_items ?? [];
        return [{
          id: checklist.id,
          name: checklist.name,
          description: checklist.description,
          checklist_type: checklist.checklist_type,
          itemCount: items.length,
          completedCount: items.filter((item: { is_checked: boolean }) => item.is_checked).length,
        }];
      });
      setChecklists(summaries);
      setUsedTemplateIds((data ?? []).flatMap((link: any) => link.source_template_id ? [link.source_template_id] : []));
      setLinkedChecklistNames(summaries.map((checklist) => checklist.name.trim().toLocaleLowerCase("pt-BR")));
      setLoading(false);
    };

    load();
  }, [serviceId, refreshKey]);

  const addChecklistsToJbr = async () => {
    if (selectedTemplateIds.length === 0) {
      toast({ title: "Selecione pelo menos um checklist", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }

    setCloning(true);
    try {
      const { data: existingLinks, error: existingLinksError } = await supabase
        .from("service_checklists")
        .select("source_template_id, checklists:checklist_id(name)")
        .eq("service_id", serviceId);
      if (existingLinksError) throw existingLinksError;

      const existingTemplateIds = new Set((existingLinks ?? []).flatMap((link: any) => link.source_template_id ? [link.source_template_id] : []));
      const existingNames = new Set((existingLinks ?? []).flatMap((link: any) => link.checklists?.name
        ? [link.checklists.name.trim().toLocaleLowerCase("pt-BR")]
        : []));

      for (const templateId of selectedTemplateIds) {
        const { data: template, error: templateError } = await supabase
          .from("checklists")
          .select("*")
          .eq("id", templateId)
          .single();
        if (templateError || !template) throw templateError ?? new Error("Template não encontrado");

        const normalizedTemplateName = template.name.trim().toLocaleLowerCase("pt-BR");
        if (template.is_template && (existingTemplateIds.has(template.id) || existingNames.has(normalizedTemplateName))) {
          throw new Error(`O checklist ${template.name} já foi adicionado a este JBR. Abra a cópia existente em vez de duplicá-la.`);
        }

        if (!template.is_template) {
          const { data: existingLink, error: linkLookupError } = await supabase
            .from("service_checklists")
            .select("service_id")
            .eq("checklist_id", template.id)
            .maybeSingle();
          if (linkLookupError) throw linkLookupError;
          if (existingLink) throw new Error(`O checklist ${template.name} já está vinculado a outro JBR.`);

          const { error: directLinkError } = await supabase.from("service_checklists").insert({
            service_id: serviceId,
            checklist_id: template.id,
          });
          if (directLinkError) throw directLinkError;

          const { error: tagError } = await supabase
            .from("checklists")
            .update({ service_tag: jbrCode })
            .eq("id", template.id);
          if (tagError) throw tagError;
          continue;
        }

        const { data: checklist, error: checklistError } = await supabase
          .from("checklists")
          .insert({
            name: template.name,
            description: template.description,
            service_tag: jbrCode,
            checklist_type: template.checklist_type,
            is_template: false,
            is_saved: false,
            created_by: user.id,
          })
          .select()
          .single();
        if (checklistError || !checklist) throw checklistError ?? new Error("Não foi possível criar o checklist");

        const { data: items, error: itemsError } = await supabase
          .from("checklist_items")
          .select("*")
          .eq("checklist_id", templateId)
          .order("order_index");
        if (itemsError) throw itemsError;

        if (items?.length) {
          const { error: copyItemsError } = await supabase.from("checklist_items").insert(
            items.map((item) => ({
              checklist_id: checklist.id,
              item_text: item.item_text,
              order_index: item.order_index,
              target_quantity: item.target_quantity,
              current_quantity: 0,
              is_checked: false,
              inventory_item_id: item.inventory_item_id,
            }))
          );
          if (copyItemsError) throw copyItemsError;
        }

        const { error: linkError } = await supabase.from("service_checklists").insert({
          service_id: serviceId,
          checklist_id: checklist.id,
          source_template_id: template.id,
        });
        if (linkError) {
          await supabase.from("checklists").delete().eq("id", checklist.id);
          throw linkError;
        }
        existingTemplateIds.add(template.id);
        existingNames.add(normalizedTemplateName);
      }

      setTemplateDialogOpen(false);
      setSelectedTemplateIds([]);
      setRefreshKey((value) => value + 1);
      onChanged?.();
      toast({ title: "Checklist(s) adicionado(s) ao JBR", description: "Os itens de saída foram baixados imediatamente do inventário." });
    } catch (error: any) {
      const duplicateMessage = error?.code === "23505"
        ? "Este template já foi utilizado neste JBR. Abra o checklist existente em vez de criar outra cópia."
        : error.message;
      toast({ title: "Não foi possível adicionar o checklist", description: duplicateMessage, variant: "destructive" });
    } finally {
      setCloning(false);
    }
  };

  const removeChecklistFromJbr = async () => {
    if (!checklistToRemove) return;

    setRemovingChecklistId(checklistToRemove.id);
    try {
      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("logistics_released_at")
        .eq("id", serviceId)
        .single();
      if (serviceError) throw serviceError;

      if (service.logistics_released_at) {
        toast({
          title: "Checklist não pode ser removido",
          description: "A logística deste JBR já foi liberada e o estoque já foi movimentado.",
          variant: "destructive",
        });
        setChecklistToRemove(null);
        return;
      }

      const { error: unlinkError } = await supabase
        .from("service_checklists")
        .delete()
        .eq("service_id", serviceId)
        .eq("checklist_id", checklistToRemove.id);
      if (unlinkError) throw unlinkError;

      const { error: tagError } = await supabase
        .from("checklists")
        .update({ service_tag: null })
        .eq("id", checklistToRemove.id);
      if (tagError) console.error("Não foi possível limpar a identificação do JBR no checklist:", tagError);

      setChecklistToRemove(null);
      setRefreshKey((value) => value + 1);
      onChanged?.();
      toast({
        title: "Checklist removido do JBR",
        description: "Os itens foram devolvidos ao estoque e o checklist continua disponível para reutilização.",
      });
    } catch (error: any) {
      toast({
        title: "Não foi possível remover o checklist",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRemovingChecklistId(null);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5" /> Checklists do JBR</CardTitle>
          <CardDescription>O checklist é o controle operacional de recursos deste serviço. Ajustes são feitos nele, mantendo um único registro confiável.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setSelectedTemplateIds([]); setTemplateDialogOpen(true); }}>
            <Copy className="mr-2 h-4 w-4" /> Adicionar checklist
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/checklist?serviceId=${serviceId}`)}>
            <ExternalLink className="mr-2 h-4 w-4" /> Abrir checklists
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando checklists...</p>
        ) : checklists.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4">
            <p className="font-medium">Nenhum checklist vinculado a este JBR.</p>
            <p className="mt-1 text-sm text-muted-foreground">Vincule um checklist padrão ao editar o JBR. Ele poderá ser ajustado no módulo de Checklists antes ou depois do campo.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {checklists.map((checklist) => {
              const progress = checklist.itemCount > 0 ? Math.round((checklist.completedCount / checklist.itemCount) * 100) : 0;
              return (
                <div key={checklist.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{checklist.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{checklist.description || (checklist.checklist_type === "saida" ? "Checklist de preparação / embarque" : "Checklist de retorno")}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      {canRemove && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Remover ${checklist.name} do JBR`}
                          disabled={removingChecklistId === checklist.id}
                          onClick={() => setChecklistToRemove(checklist)}
                        >
                          {removingChecklistId === checklist.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Progress value={progress} className="h-2" />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{checklist.completedCount}/{checklist.itemCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar checklist ao JBR</DialogTitle>
            <DialogDescription>Escolha templates para copiar ou checklists existentes sem JBR para vincular ao {jbrCode}.</DialogDescription>
          </DialogHeader>
          <ServiceChecklistsSelect
            mode="available"
            selectedChecklistIds={selectedTemplateIds}
            onChange={setSelectedTemplateIds}
            disabledChecklistIds={usedTemplateIds}
            disabledChecklistNames={linkedChecklistNames}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)} disabled={cloning}>Cancelar</Button>
            <Button onClick={addChecklistsToJbr} disabled={cloning}>{cloning ? "Adicionando..." : "Adicionar ao JBR"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!checklistToRemove} onOpenChange={(open) => !open && setChecklistToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover checklist do JBR?</AlertDialogTitle>
            <AlertDialogDescription>
              O checklist “{checklistToRemove?.name}” será desvinculado do {jbrCode}. Os itens baixados serão devolvidos ao estoque, mas o checklist não será apagado e poderá ser reutilizado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingChecklistId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void removeChecklistFromJbr();
              }}
              disabled={!!removingChecklistId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingChecklistId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Remover do JBR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
