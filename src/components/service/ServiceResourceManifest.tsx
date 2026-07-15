import { useMemo, useState } from "react";
import { PackageCheck, RotateCcw, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useServiceResourceManifest, type ServiceResourceManifestItem } from "@/hooks/useServiceResourceManifest";
import { useToast } from "@/hooks/use-toast";

interface ServiceResourceManifestProps {
  serviceId: string;
}

const statusLabel: Record<string, string> = {
  planned: "Reservado",
  dispatched: "Em campo",
  returned: "Retornado",
  cancelled: "Cancelado",
};

export const ServiceResourceManifest = ({ serviceId }: ServiceResourceManifestProps) => {
  const { items, availableResources, loading, addResource, dispatchResource, returnResource } = useServiceResourceManifest(serviceId);
  const { toast } = useToast();
  const [resourceId, setResourceId] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [returningItem, setReturningItem] = useState<ServiceResourceManifestItem | null>(null);
  const [returnedQuantity, setReturnedQuantity] = useState("0");
  const [consumedQuantity, setConsumedQuantity] = useState("0");
  const [returnNotes, setReturnNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedResource = useMemo(
    () => availableResources.find((resource) => resource.id === resourceId),
    [availableResources, resourceId]
  );

  const addToManifest = async () => {
    const quantity = Number(plannedQuantity);
    if (!resourceId || !Number.isInteger(quantity) || quantity <= 0) {
      toast({ title: "Informe o recurso e a quantidade planejada", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await addResource(resourceId, quantity, notes);
    setSubmitting(false);
    if (error) {
      toast({ title: "Não foi possível reservar o recurso", description: error.message, variant: "destructive" });
      return;
    }
    setResourceId("");
    setPlannedQuantity("1");
    setNotes("");
    toast({ title: "Recurso reservado para o JBR" });
  };

  const dispatch = async (item: ServiceResourceManifestItem) => {
    setSubmitting(true);
    const { error } = await dispatchResource(item.id, item.planned_quantity);
    setSubmitting(false);
    if (error) toast({ title: "Falha no embarque", description: error.message, variant: "destructive" });
    else toast({ title: "Embarque registrado", description: `${item.inventory?.item_name ?? "Recurso"} liberado para campo.` });
  };

  const openReturn = (item: ServiceResourceManifestItem) => {
    setReturningItem(item);
    setReturnedQuantity(String(item.dispatched_quantity));
    setConsumedQuantity("0");
    setReturnNotes(item.notes ?? "");
  };

  const confirmReturn = async () => {
    if (!returningItem) return;
    const returned = Number(returnedQuantity);
    const consumed = Number(consumedQuantity);
    if (!Number.isInteger(returned) || !Number.isInteger(consumed) || returned < 0 || consumed < 0 || returned + consumed > returningItem.dispatched_quantity) {
      toast({ title: "Quantidades inválidas", description: "Retornado + consumido não pode ultrapassar o embarcado.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await returnResource(returningItem.id, returned, consumed, returnNotes);
    setSubmitting(false);
    if (error) {
      toast({ title: "Falha no desembarque", description: error.message, variant: "destructive" });
      return;
    }
    setReturningItem(null);
    toast({ title: "Desembarque registrado e estoque atualizado" });
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><PackageCheck className="h-5 w-5" /> Recursos do JBR</CardTitle>
          <CardDescription>Reserve recursos na preparação, confirme o embarque e faça a conferência no retorno.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr_auto]">
            <div className="space-y-1.5">
              <Label>Recurso</Label>
              <Select value={resourceId} onValueChange={setResourceId}>
                <SelectTrigger><SelectValue placeholder="Selecione no estoque" /></SelectTrigger>
                <SelectContent>
                  {availableResources.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.item_name} · {resource.quantity} {resource.unit ?? "un."}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Previsto</Label>
              <Input type="number" min="1" value={plannedQuantity} onChange={(event) => setPlannedQuantity(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={selectedResource ? `Para ${selectedResource.item_name}` : "Opcional"} />
            </div>
            <Button className="self-end" onClick={addToManifest} disabled={submitting}>Reservar</Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando manifesto...</p>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhum recurso reservado para este JBR.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const divergence = item.status === "returned" && item.returned_quantity !== null
                  ? Math.max(0, item.dispatched_quantity - item.returned_quantity - item.consumed_quantity)
                  : 0;
                return (
                  <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.inventory?.item_name ?? "Recurso removido"}</p>
                        <Badge variant={item.status === "returned" ? "secondary" : "outline"}>{statusLabel[item.status]}</Badge>
                        {divergence > 0 && <Badge variant="destructive" className="gap-1"><TriangleAlert className="h-3 w-3" /> Divergência: {divergence}</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Previsto: {item.planned_quantity} · Embarcado: {item.dispatched_quantity}
                        {item.status === "returned" && ` · Retornado: ${item.returned_quantity} · Consumido: ${item.consumed_quantity}`}
                        {item.inventory?.unit ? ` ${item.inventory.unit}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {item.status === "planned" && <Button size="sm" onClick={() => dispatch(item)} disabled={submitting}><Send className="mr-2 h-4 w-4" />Confirmar embarque</Button>}
                      {item.status === "dispatched" && <Button size="sm" variant="outline" onClick={() => openReturn(item)}><RotateCcw className="mr-2 h-4 w-4" />Desembarque</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!returningItem} onOpenChange={(open) => !open && setReturningItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checklist de desembarque</DialogTitle>
            <DialogDescription>Informe o que retornou e o que foi efetivamente consumido. A diferença será registrada como divergência.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Quantidade retornada</Label><Input type="number" min="0" value={returnedQuantity} onChange={(event) => setReturnedQuantity(event.target.value)} /></div>
            <div className="space-y-2"><Label>Quantidade consumida</Label><Input type="number" min="0" value={consumedQuantity} onChange={(event) => setConsumedQuantity(event.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Observação</Label><Textarea value={returnNotes} onChange={(event) => setReturnNotes(event.target.value)} placeholder="Ex.: item danificado, perda identificada ou consumo justificado." /></div>
          <DialogFooter><Button onClick={confirmReturn} disabled={submitting}>{submitting ? "Salvando..." : "Confirmar retorno"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
