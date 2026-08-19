import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, AlertTriangle, ExternalLink, Link2, Loader2 } from "lucide-react";
import type { ReservationGroup, ReservationSummary } from "@/hooks/useInventoryReservations";

interface InventoryReservationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ReservationGroup[];
  summary: ReservationSummary;
  loading: boolean;
}

export default function InventoryReservationsDialog({
  open,
  onOpenChange,
  groups,
  summary,
  loading,
}: InventoryReservationsDialogProps) {
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);

  const visibleGroups = useMemo(
    () => (onlyUnlinked ? groups.filter((g) => g.is_unlinked) : groups),
    [groups, onlyUnlinked],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Reservas de estoque
          </DialogTitle>
          <DialogDescription>
            {summary.reservedUnits} unidades reservadas por checklists de saída ativos
            {summary.unlinkedReservedUnits > 0
              ? ` · ${summary.unlinkedReservedUnits} em ${summary.unlinkedChecklists} checklist(s) avulso(s)`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={onlyUnlinked ? "outline" : "default"}
            onClick={() => setOnlyUnlinked(false)}
          >
            Todos ({groups.length})
          </Button>
          <Button
            size="sm"
            variant={onlyUnlinked ? "default" : "outline"}
            onClick={() => setOnlyUnlinked(true)}
          >
            Somente avulsos ({groups.filter((g) => g.is_unlinked).length})
          </Button>
        </div>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando reservas...
            </div>
          ) : visibleGroups.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Lock className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>Nenhuma reserva ativa de estoque</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleGroups.map((group) => (
                <Card
                  key={group.checklist_id}
                  className={group.is_unlinked ? "border-amber-500/40 bg-amber-500/5" : undefined}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{group.checklist_name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {group.is_unlinked ? (
                            <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Avulso — sem JBR
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Link2 className="mr-1 h-3 w-3" />
                              {group.service_code}
                              {group.service_client ? ` · ${group.service_client}` : ""}
                            </Badge>
                          )}
                          {group.created_at && (
                            <span>
                              Criado em {new Date(group.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-lg font-bold">{group.reserved_quantity}</div>
                          <div className="text-xs text-muted-foreground">reservado</div>
                        </div>
                        <Button asChild size="icon" variant="ghost">
                          <Link
                            to={
                              group.service_id
                                ? `/checklist?serviceId=${group.service_id}`
                                : "/checklist"
                            }
                            onClick={() => onOpenChange(false)}
                            aria-label="Abrir checklist"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0">
                    {group.items.map((item) => (
                      <div
                        key={item.checklist_item_id}
                        className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{item.item_name}</span>
                        <span className="text-xs text-muted-foreground">
                          planejado {item.planned_quantity} · despachado {item.dispatched_quantity} ·{" "}
                          <span className="font-semibold text-foreground">
                            reservado {item.reserved_quantity}
                          </span>
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
