import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, PackageX, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Movement = {
  id: string;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string | null;
  created_at: string;
  inventory: { item_name: string; unit: string | null } | null;
};

const MOVEMENT_CONFIG: Record<string, { label: string; className: string; icon: typeof Boxes }> = {
  dispatch: { label: "Embarque", className: "border-blue-300 text-blue-700", icon: ArrowUpFromLine },
  return: { label: "Retorno", className: "border-emerald-300 text-emerald-700", icon: ArrowDownToLine },
  consumption: { label: "Consumido", className: "border-amber-300 text-amber-700", icon: Boxes },
  missing: { label: "Ausente", className: "border-red-300 text-red-700", icon: PackageX },
  damaged: { label: "Danificado", className: "border-red-300 text-red-700", icon: AlertTriangle },
  maintenance: { label: "Manutenção", className: "border-purple-300 text-purple-700", icon: Wrench },
};

export const ServiceInventoryMovementsPanel = ({ serviceId, refreshKey }: { serviceId: string; refreshKey: number }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("service_inventory_movements")
        .select("id, movement_type, quantity, previous_quantity, new_quantity, notes, created_at, inventory:inventory_item_id(item_name, unit)")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });

      setMovements((data ?? []) as Movement[]);
      setLoading(false);
    };

    load();
  }, [serviceId, refreshKey]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Boxes className="h-5 w-5" /> Movimentações de estoque</CardTitle>
        <CardDescription>Extrato operacional gerado pelas etapas de embarque e retorno deste JBR.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando movimentações...</p>
        ) : movements.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Nenhuma movimentação consolidada. O primeiro registro será criado na liberação logística.
          </div>
        ) : (
          <div className="space-y-3">
            {movements.map((movement) => {
              const config = MOVEMENT_CONFIG[movement.movement_type] ?? MOVEMENT_CONFIG.consumption;
              const Icon = config.icon;
              const unit = movement.inventory?.unit || "un";
              return (
                <div key={movement.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-full bg-muted p-2"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <p className="font-medium">{movement.inventory?.item_name || "Item removido do inventário"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {movement.quantity} {unit} · saldo {movement.previous_quantity} → {movement.new_quantity}
                      </p>
                      {movement.notes && <p className="mt-1 text-xs text-muted-foreground">{movement.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={config.className}>{config.label}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(movement.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
