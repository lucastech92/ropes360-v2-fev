import { useEffect, useMemo, useState } from "react";
import { Box, CheckCircle2, ClipboardCheck, Plus, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OperationContainer = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  assigned_service_id: string | null;
};

type ChecklistProgress = {
  total: number;
  completed: number;
};

interface ServiceLogisticsPanelProps {
  serviceId: string;
  containerId: string | null;
  releasedAt: string | null;
  canManage: boolean;
  onChanged: () => void;
}

export const ServiceLogisticsPanel = ({
  serviceId,
  containerId,
  releasedAt,
  canManage,
  onChanged,
}: ServiceLogisticsPanelProps) => {
  const { toast } = useToast();
  const [containers, setContainers] = useState<OperationContainer[]>([]);
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress>({ total: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newContainerName, setNewContainerName] = useState("");
  const [newContainerCode, setNewContainerCode] = useState("");

  const load = async () => {
    setLoading(true);
    const [containersResult, checklistsResult] = await Promise.all([
      supabase
        .from("operation_containers")
        .select("id, name, code, status, assigned_service_id")
        .order("name"),
      supabase
        .from("service_checklists")
        .select("checklists:checklist_id(checklist_items(id, is_checked))")
        .eq("service_id", serviceId),
    ]);

    if (containersResult.error) {
      toast({ title: "Não foi possível carregar os containers", description: containersResult.error.message, variant: "destructive" });
    } else {
      setContainers((containersResult.data ?? []) as OperationContainer[]);
    }

    const items = (checklistsResult.data ?? []).flatMap((link: any) => link.checklists?.checklist_items ?? []);
    setChecklistProgress({
      total: items.length,
      completed: items.filter((item: { is_checked: boolean }) => item.is_checked).length,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [serviceId]);

  const selectedContainer = useMemo(
    () => containers.find((container) => container.id === containerId) ?? null,
    [containers, containerId],
  );
  const isChecklistComplete = checklistProgress.total > 0 && checklistProgress.completed === checklistProgress.total;
  const checklistPercent = checklistProgress.total > 0
    ? Math.round((checklistProgress.completed / checklistProgress.total) * 100)
    : 0;

  const assignContainer = async (nextContainerId: string) => {
    setSaving(true);
    const { error } = await supabase.rpc("assign_service_container", {
      p_service_id: serviceId,
      p_container_id: nextContainerId,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Não foi possível reservar o container", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Container reservado para este JBR" });
    onChanged();
    load();
  };

  const createContainer = async () => {
    const name = newContainerName.trim();
    if (!name) {
      toast({ title: "Informe o nome do container", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("operation_containers")
      .insert({ name, code: newContainerCode.trim() || null })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      toast({ title: "Não foi possível cadastrar o container", description: error?.message, variant: "destructive" });
      return;
    }

    setNewContainerName("");
    setNewContainerCode("");
    setCreateOpen(false);
    await assignContainer(data.id);
  };

  const releaseLogistics = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("release_service_logistics", { p_service_id: serviceId });
    setSaving(false);

    if (error) {
      toast({ title: "Não foi possível liberar o JBR", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "JBR liberado para campo",
      description: isChecklistComplete ? "Container reservado e recursos baixados do estoque." : "Container reservado e quantidades embarcadas baixadas. Há itens pendentes no checklist.",
    });
    onChanged();
    load();
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><Box className="h-5 w-5" /> Liberação logística</CardTitle>
          <CardDescription>Defina o container e acompanhe os checklists antes de liberar o JBR para campo.</CardDescription>
        </div>
        {releasedAt ? (
          <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Liberado</Badge>
        ) : (
          <Badge variant="outline">Em preparação</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Container do JBR</Label>
            <div className="flex gap-2">
              <Select value={containerId ?? undefined} onValueChange={assignContainer} disabled={!canManage || saving || Boolean(releasedAt)}>
                <SelectTrigger><SelectValue placeholder={loading ? "Carregando..." : "Selecione um container"} /></SelectTrigger>
                <SelectContent>
                  {containers
                    .filter((container) => container.status === "available" || container.assigned_service_id === serviceId)
                    .map((container) => (
                      <SelectItem key={container.id} value={container.id}>
                        {container.name}{container.code ? ` · ${container.code}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {canManage && !releasedAt && (
                <Button variant="outline" size="icon" onClick={() => setCreateOpen(true)} title="Cadastrar container">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            {selectedContainer ? (
              <p className="text-xs text-muted-foreground">{selectedContainer.status === "reserved" ? "Reservado para este JBR." : "Disponível para uso."}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Cadastre o primeiro container pelo botão +, se necessário.</p>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium"><ClipboardCheck className="h-4 w-4" /> Checklists vinculados</span>
              <span className={isChecklistComplete ? "font-medium text-emerald-600" : "text-muted-foreground"}>{checklistProgress.completed}/{checklistProgress.total}</span>
            </div>
            <Progress value={checklistPercent} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {isChecklistComplete ? "Todos os itens foram conferidos." : "Há itens pendentes. A liberação continua disponível."}
            </p>
          </div>
        </div>

        {!releasedAt && canManage && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">A confirmação reserva o container e baixa somente as quantidades já embarcadas. Checklists pendentes permanecem visíveis.</p>
            <Button onClick={releaseLogistics} disabled={saving || !containerId}>
              <ShieldCheck className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Liberar JBR"}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar container</DialogTitle>
            <DialogDescription>Este cadastro ficará disponível para os próximos JBRs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="container-name">Nome</Label>
              <Input id="container-name" value={newContainerName} onChange={(event) => setNewContainerName(event.target.value)} placeholder="Ex.: Container MRT 01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="container-code">Código (opcional)</Label>
              <Input id="container-code" value={newContainerCode} onChange={(event) => setNewContainerCode(event.target.value)} placeholder="Ex.: CONT-01" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={createContainer} disabled={saving}>{saving ? "Cadastrando..." : "Cadastrar e selecionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
