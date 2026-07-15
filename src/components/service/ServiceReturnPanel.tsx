import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ClipboardCheck, PackageCheck, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ReturnCondition = "good" | "damaged" | "maintenance" | "missing";

type ReturnInventory = {
  item_type: "consumivel" | "equipamento";
  unit: string | null;
} | null;

type ReturnItem = {
  id: string;
  checklist_name: string;
  item_name: string;
  dispatched_quantity: number;
  returned_quantity: number | null;
  consumed_quantity: number;
  return_condition: ReturnCondition | null;
  notes: string | null;
  checked_at: string | null;
  inventory: ReturnInventory;
};

type ReturnSession = {
  id: string;
  inventory_applied_at: string | null;
  status: "draft" | "completed";
  notes: string | null;
  completed_at: string | null;
  service_return_items: ReturnItem[];
};

type ItemDraft = {
  returned: string;
  condition: ReturnCondition;
  notes: string;
};

const CONDITION_LABELS: Record<ReturnCondition, string> = {
  good: "Bom estado",
  damaged: "Danificado",
  maintenance: "Enviar para manutenção",
  missing: "Não retornou",
};

export const ServiceReturnPanel = ({ serviceId, onChanged }: { serviceId: string; onChanged: () => void }) => {
  const { toast } = useToast();
  const [session, setSession] = useState<ReturnSession | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [finalNotes, setFinalNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_return_sessions")
      .select("id, status, notes, completed_at, inventory_applied_at, service_return_items(id, checklist_name, item_name, dispatched_quantity, returned_quantity, consumed_quantity, return_condition, notes, checked_at, inventory:inventory_item_id(item_type, unit))")
      .eq("service_id", serviceId)
      .maybeSingle();

    if (error) {
      setLoading(false);
      toast({ title: "Não foi possível carregar a conferência de retorno", description: error.message, variant: "destructive" });
      return;
    }

    if (!data) {
      setSession(null);
      setDrafts({});
      setLoading(false);
      return;
    }

    const normalized = {
      ...data,
      service_return_items: [...(data.service_return_items ?? [])].sort((a, b) =>
        `${a.checklist_name}-${a.item_name}`.localeCompare(`${b.checklist_name}-${b.item_name}`, "pt-BR")
      ),
    } as ReturnSession;
    setSession(normalized);
    setFinalNotes(normalized.notes ?? "");
    setDrafts(Object.fromEntries(normalized.service_return_items.map((item) => [
      item.id,
      {
        returned: item.returned_quantity === null ? String(item.dispatched_quantity) : String(item.returned_quantity),
        condition: item.return_condition ?? "good",
        notes: item.notes ?? "",
      },
    ])));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [serviceId]);

  const items = session?.service_return_items ?? [];
  const checkedCount = items.filter((item) => item.checked_at).length;
  const divergenceCount = items.filter((item) =>
    item.checked_at && (
      (item.returned_quantity ?? 0) < item.dispatched_quantity
      || item.return_condition === "damaged"
      || item.return_condition === "maintenance"
      || item.return_condition === "missing"
    ),
  ).length;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;
  const allChecked = items.length > 0 && checkedCount === items.length;
  const completed = session?.status === "completed";
  const inventoryApplied = Boolean(session?.inventory_applied_at);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, ReturnItem[]>();
    items.forEach((item) => groups.set(item.checklist_name, [...(groups.get(item.checklist_name) ?? []), item]));
    return [...groups.entries()];
  }, [items]);

  const startReturn = async () => {
    setStarting(true);
    const { error } = await supabase.rpc("start_service_return", { p_service_id: serviceId });
    setStarting(false);
    if (error) {
      toast({
        title: "Não foi possível iniciar o retorno",
        description: error.message.includes("No dispatched")
          ? "Nenhum item com quantidade embarcada foi encontrado nos checklists de saída deste JBR."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Conferência de retorno iniciada" });
    load();
  };

  const updateDraft = (itemId: string, patch: Partial<ItemDraft>) => {
    setDrafts((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
  };

  const saveItem = async (item: ReturnItem) => {
    const draft = drafts[item.id];
    const returned = Number(draft.returned);
    if (!Number.isInteger(returned) || returned < 0 || returned > item.dispatched_quantity) {
      toast({ title: "Quantidade inválida", description: `Informe um valor entre 0 e ${item.dispatched_quantity}.`, variant: "destructive" });
      return;
    }

    setSavingId(item.id);
    const { error } = await supabase.rpc("record_service_return_item", {
      p_return_item_id: item.id,
      p_returned_quantity: returned,
      p_return_condition: returned === 0 ? "missing" : draft.condition,
      p_notes: draft.notes || null,
    });
    setSavingId(null);

    if (error) {
      toast({ title: "Não foi possível salvar o item", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Item conferido" });
    load();
  };

  const completeReturn = async () => {
    if (!session) return;
    setCompleting(true);
    const { error } = await supabase.rpc("complete_service_return", {
      p_return_session_id: session.id,
      p_notes: finalNotes || null,
    });
    setCompleting(false);

    if (error) {
      toast({ title: "Não foi possível concluir o retorno", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Retorno e estoque concluídos", description: "Saldos reconciliados e container liberado para outro JBR." });
    onChanged();
    load();
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><RotateCcw className="h-5 w-5" /> Retorno do container</CardTitle>
          <CardDescription>Compare o que foi embarcado com o que voltou. Ao concluir, o sistema reconcilia o estoque e libera o container.</CardDescription>
        </div>
        {completed && inventoryApplied ? (
          <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Concluído</Badge>
        ) : completed ? (
          <Badge variant="outline" className="border-amber-300 text-amber-700">Aguardando estoque</Badge>
        ) : session ? (
          <Badge variant="outline">Em conferência</Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando retorno...</p>
        ) : !session ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed p-4">
            <div>
              <p className="font-medium">Conferência ainda não iniciada</p>
              <p className="mt-1 text-sm text-muted-foreground">O sistema copiará as quantidades embarcadas dos checklists de saída vinculados ao JBR.</p>
            </div>
            <Button onClick={startReturn} disabled={starting}>
              <PackageCheck className="mr-2 h-4 w-4" /> {starting ? "Preparando..." : "Iniciar retorno"}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Itens conferidos</p>
                <p className="mt-1 text-xl font-semibold">{checkedCount}/{items.length}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Divergências</p>
                <p className={`mt-1 text-xl font-semibold ${divergenceCount ? "text-amber-600" : "text-emerald-600"}`}>{divergenceCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Progresso</p>
                <Progress value={progress} className="mt-3 h-2" />
              </div>
            </div>

            {groupedItems.map(([checklistName, checklistItems]) => (
              <div key={checklistName} className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">{checklistName}</h4>
                </div>
                {checklistItems.map((item) => {
                  const draft = drafts[item.id];
                  if (!draft) return null;
                  const returned = Number(draft.returned || 0);
                  const consumed = Math.max(0, item.dispatched_quantity - returned);
                  const isConsumable = item.inventory?.item_type === "consumivel";
                  const unit = item.inventory?.unit || "un";
                  const hasDraftDivergence = returned < item.dispatched_quantity || draft.condition !== "good";

                  return (
                    <div key={item.id} className={`rounded-lg border p-4 ${item.checked_at ? "bg-muted/20" : ""}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.item_name}</p>
                            {item.checked_at && <Check className="h-4 w-4 text-emerald-600" />}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Embarcado: {item.dispatched_quantity} {unit}</p>
                        </div>
                        {hasDraftDivergence && (
                          <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700"><AlertTriangle className="h-3 w-3" /> Divergência</Badge>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`returned-${item.id}`}>Quantidade retornada</Label>
                          <Input
                            id={`returned-${item.id}`}
                            type="number"
                            min={0}
                            max={item.dispatched_quantity}
                            step={1}
                            value={draft.returned}
                            disabled={completed}
                            onChange={(event) => updateDraft(item.id, { returned: event.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{isConsumable ? "Consumo calculado" : "Condição"}</Label>
                          {isConsumable ? (
                            <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">{consumed} {unit}</div>
                          ) : (
                            <Select value={returned === 0 ? "missing" : draft.condition} disabled={completed || returned === 0} onValueChange={(value) => updateDraft(item.id, { condition: value as ReturnCondition })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(CONDITION_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`notes-${item.id}`}>Observação</Label>
                          <Input
                            id={`notes-${item.id}`}
                            value={draft.notes}
                            disabled={completed}
                            placeholder="Opcional"
                            onChange={(event) => updateDraft(item.id, { notes: event.target.value })}
                          />
                        </div>
                      </div>

                      {!completed && (
                        <div className="mt-3 flex justify-end">
                          <Button size="sm" variant={item.checked_at ? "outline" : "default"} onClick={() => saveItem(item)} disabled={savingId === item.id}>
                            {savingId === item.id ? "Salvando..." : item.checked_at ? "Atualizar conferência" : "Confirmar item"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="return-notes">Observações finais do retorno</Label>
              <Textarea id="return-notes" value={finalNotes} disabled={completed} onChange={(event) => setFinalNotes(event.target.value)} placeholder="Pendências, materiais danificados ou ações necessárias" />
            </div>

            {(!completed || !inventoryApplied) && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">
                  {completed ? "A conferência já foi fechada. Aplique agora a movimentação pendente no estoque." : "Todos os itens precisam ser conferidos antes do fechamento e da atualização do estoque."}
                </p>
                <Button onClick={completeReturn} disabled={!allChecked || completing}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> {completing ? "Concluindo..." : completed ? "Aplicar ao estoque" : "Concluir retorno e estoque"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
