import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checklist } from "@/hooks/useChecklistData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Service { id: string; codigo_jbr: string; cliente: string; local: string | null; }
interface Container { id: string; name: string; code: string | null; status: string; assigned_service_id: string | null; }
interface ChecklistCloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Checklist | null;
  onClone: (serviceTag: string, name?: string, serviceId?: string, containerId?: string) => Promise<void>;
}

export const ChecklistCloneDialog = ({ open, onOpenChange, template, onClone }: ChecklistCloneDialogProps) => {
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [containerId, setContainerId] = useState("none");
  const [services, setServices] = useState<Service[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingContainer, setCreatingContainer] = useState(false);
  const [showCreateContainer, setShowCreateContainer] = useState(false);
  const [newContainerName, setNewContainerName] = useState("");
  const [newContainerCode, setNewContainerCode] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? ""); setServiceId(""); setContainerId("none"); setShowCreateContainer(false); setNewContainerName(""); setNewContainerCode(""); setLoading(true);
    Promise.all([
      supabase.from("services").select("id,codigo_jbr,cliente,local").order("created_at", { ascending: false }),
      supabase.from("operation_containers").select("id,name,code,status,assigned_service_id").order("name"),
    ]).then(([serviceResult, containerResult]) => {
      setServices((serviceResult.data ?? []) as Service[]);
      setContainers((containerResult.data ?? []) as Container[]);
    }).finally(() => setLoading(false));
  }, [open, template]);

  const selectedService = services.find(service => service.id === serviceId);
  const availableContainers = containers.filter(container => container.status === "available" || container.assigned_service_id === serviceId);
  const handleSubmit = async () => {
    setSaving(true);
    try { await onClone(selectedService?.codigo_jbr ?? "", name || undefined, selectedService?.id, selectedService && containerId !== "none" ? containerId : undefined); }
    finally { setSaving(false); }
  };

  const createContainer = async () => {
    if (!newContainerName.trim()) {
      toast({ title: "Informe o nome do container", variant: "destructive" });
      return;
    }
    setCreatingContainer(true);
    const { data, error } = await supabase.from("operation_containers").insert({ name: newContainerName.trim(), code: newContainerCode.trim() || null, status: "available" }).select("id,name,code,status,assigned_service_id").single();
    setCreatingContainer(false);
    if (error || !data) {
      toast({ title: "Não foi possível criar o container", description: error?.message, variant: "destructive" });
      return;
    }
    const created = data as Container;
    setContainers(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    setContainerId(created.id);
    setShowCreateContainer(false);
    setNewContainerName(""); setNewContainerCode("");
    toast({ title: "Container criado e selecionado" });
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Copy className="h-5 w-5" />Clonar checklist para JBR</DialogTitle><DialogDescription>Copie “{template?.name}” e já vincule ao serviço e, se desejar, ao container.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><Label>JBR do serviço (opcional)</Label><Select value={serviceId || "none"} onValueChange={(value) => { setServiceId(value === "none" ? "" : value); setContainerId("none"); }} disabled={loading}><SelectTrigger><SelectValue placeholder={loading ? "Carregando JBRs..." : "Selecione o JBR"} /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum JBR — checklist independente</SelectItem>{services.map(service => <SelectItem key={service.id} value={service.id}><span className="font-medium">{service.codigo_jbr}</span> · {service.cliente}{service.local ? ` · ${service.local}` : ""}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>Container (opcional)</Label><Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={() => setShowCreateContainer(value => !value)}><Plus className="h-4 w-4" />Criar container</Button></div>
          <Select value={containerId} onValueChange={setContainerId} disabled={!serviceId || loading}><SelectTrigger><SelectValue placeholder="Selecione um container" /></SelectTrigger><SelectContent><SelectItem value="none">Definir depois</SelectItem>{availableContainers.map(container => <SelectItem key={container.id} value={container.id}>{container.name}{container.code ? ` · ${container.code}` : ""}{container.assigned_service_id === serviceId ? " · já reservado" : ""}</SelectItem>)}</SelectContent></Select>
          {showCreateContainer && <div className="space-y-3 rounded-md border bg-muted/30 p-3"><p className="text-sm font-medium">Novo container</p><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="quick-container-name">Nome *</Label><Input id="quick-container-name" value={newContainerName} onChange={event => setNewContainerName(event.target.value)} placeholder="Container MRT 01" /></div><div className="space-y-1"><Label htmlFor="quick-container-code">Código</Label><Input id="quick-container-code" value={newContainerCode} onChange={event => setNewContainerCode(event.target.value)} placeholder="CONT-01" /></div></div><div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateContainer(false)}>Cancelar</Button><Button type="button" size="sm" onClick={createContainer} disabled={creatingContainer}>{creatingContainer ? "Criando..." : "Criar e selecionar"}</Button></div></div>}
          <p className="text-xs text-muted-foreground">A seleção reserva o container para este JBR. Containers usados por outros serviços não aparecem.</p>
        </div>
        <div className="space-y-2"><Label htmlFor="clone-name">Nome do checklist</Label><Input id="clone-name" value={name} onChange={event => setName(event.target.value)} /></div>
        {template && <div className="rounded-lg bg-muted p-3 text-sm"><p className="mb-1 font-medium">Template selecionado</p><div className="flex items-center gap-2"><Badge variant="outline">{template.checklist_type === "entrada" ? "Entrada" : "Saída"}</Badge><span>{template.name}</span></div><p className="mt-2 text-muted-foreground">Os itens serão copiados com quantidades zeradas.</p></div>}
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button onClick={handleSubmit} disabled={saving}><Copy className="mr-2 h-4 w-4" />{saving ? "Clonando..." : serviceId ? "Clonar e vincular" : "Clonar checklist"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
};
