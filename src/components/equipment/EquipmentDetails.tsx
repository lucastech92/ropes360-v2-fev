import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Equipment,
  EquipmentAllocation,
  EquipmentStatus,
  EquipmentCondition,
} from "@/hooks/useEquipment";
import { supabase } from "@/integrations/supabase/client";
import {
  Package,
  Calendar,
  MapPin,
  User,
  Clock,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EquipmentDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  fetchAllocations: (equipmentId: string) => Promise<EquipmentAllocation[]>;
}

interface AllocationWithUser extends EquipmentAllocation {
  checkedOutByName?: string;
  checkedInByName?: string;
  serviceName?: string;
}

const EquipmentDetails = ({
  open,
  onOpenChange,
  equipment,
  fetchAllocations,
}: EquipmentDetailsProps) => {
  const [allocations, setAllocations] = useState<AllocationWithUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAllocations = async () => {
      if (!equipment || !open) return;
      setLoading(true);
      try {
        const data = await fetchAllocations(equipment.id);
        
        // Enrich with user and service names
        const enriched = await Promise.all(
          data.map(async (allocation) => {
            let checkedOutByName = "Usuário";
            let checkedInByName = "";
            let serviceName = "";

            // Get service info
            if (allocation.service_id) {
              const { data: serviceData } = await supabase
                .from("services")
                .select("codigo_jbr, cliente")
                .eq("id", allocation.service_id)
                .maybeSingle();
              if (serviceData) {
                serviceName = `${serviceData.codigo_jbr} - ${serviceData.cliente}`;
              }
            }

            return {
              ...allocation,
              checkedOutByName,
              checkedInByName,
              serviceName,
            };
          })
        );

        setAllocations(enriched);
      } catch (error) {
        console.error("Error loading allocations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllocations();
  }, [equipment, open]);

  if (!equipment) return null;

  const statusConfig: Record<EquipmentStatus, { label: string; className: string }> = {
    available: { label: "Disponível", className: "bg-emerald-500/10 text-emerald-500" },
    in_service: { label: "Em Serviço", className: "bg-blue-500/10 text-blue-500" },
    maintenance: { label: "Manutenção", className: "bg-amber-500/10 text-amber-500" },
    calibration: { label: "Calibração", className: "bg-purple-500/10 text-purple-500" },
    inactive: { label: "Inativo", className: "bg-muted text-muted-foreground" },
  };

  const conditionConfig: Record<EquipmentCondition, { label: string; className: string }> = {
    excellent: { label: "Excelente", className: "text-emerald-500" },
    good: { label: "Bom", className: "text-blue-500" },
    fair: { label: "Regular", className: "text-amber-500" },
    needs_repair: { label: "Precisa Reparo", className: "text-orange-500" },
    damaged: { label: "Danificado", className: "text-destructive" },
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {equipment.name}
          </SheetTitle>
          <SheetDescription className="font-mono">{equipment.code}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-6">
                {/* Status Section */}
                <div className="flex items-center gap-3">
                  <Badge className={cn("text-sm", statusConfig[equipment.status].className)}>
                    {statusConfig[equipment.status].label}
                  </Badge>
                  <span className={cn("text-sm", conditionConfig[equipment.condition].className)}>
                    {conditionConfig[equipment.condition].label}
                  </span>
                </div>

                <Separator />

                {/* Details Grid */}
                <div className="space-y-4">
                  <InfoRow label="Categoria" value={equipment.category} />
                  <InfoRow label="Número de Série" value={equipment.serial_number} />
                  <InfoRow label="Fabricante" value={equipment.manufacturer} />
                  <InfoRow label="Modelo" value={equipment.model} />
                  <InfoRow
                    label="Data de Aquisição"
                    value={
                      equipment.acquisition_date
                        ? format(new Date(equipment.acquisition_date), "dd/MM/yyyy", { locale: ptBR })
                        : null
                    }
                  />
                </div>

                <Separator />

                {/* Location */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localização
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {equipment.current_location || "Base"}
                  </p>
                </div>

                <Separator />

                {/* Calibration */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Calibração
                  </h4>
                  <div className="space-y-2 text-sm">
                    <InfoRow
                      label="Última Calibração"
                      value={
                        equipment.last_calibration
                          ? format(new Date(equipment.last_calibration), "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          : null
                      }
                    />
                    <InfoRow
                      label="Próxima Calibração"
                      value={
                        equipment.next_calibration
                          ? format(new Date(equipment.next_calibration), "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          : null
                      }
                      highlight={
                        equipment.next_calibration &&
                        new Date(equipment.next_calibration) <=
                          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      }
                    />
                    <InfoRow
                      label="Intervalo"
                      value={
                        equipment.calibration_interval_months
                          ? `${equipment.calibration_interval_months} meses`
                          : null
                      }
                    />
                  </div>
                </div>

                {/* Notes */}
                {equipment.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Observações</h4>
                      <p className="text-sm text-muted-foreground">{equipment.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[calc(100vh-250px)]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : allocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação registrada
                </div>
              ) : (
                <div className="space-y-4">
                  {allocations.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {format(new Date(allocation.checkout_date), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        {allocation.checkin_date ? (
                          <Badge variant="outline" className="text-emerald-500">
                            Retornado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-500">
                            Em uso
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Base</span>
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-medium">{allocation.destination}</span>
                      </div>

                      {allocation.serviceName && (
                        <p className="text-xs text-muted-foreground">
                          Serviço: {allocation.serviceName}
                        </p>
                      )}

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          Saída: {conditionConfig[allocation.condition_on_checkout].label}
                        </span>
                        {allocation.condition_on_checkin && (
                          <span
                            className={cn(
                              allocation.condition_on_checkin === "needs_repair" ||
                                allocation.condition_on_checkin === "damaged"
                                ? "text-destructive"
                                : ""
                            )}
                          >
                            Retorno: {conditionConfig[allocation.condition_on_checkin].label}
                          </span>
                        )}
                      </div>

                      {allocation.checkin_date && (
                        <p className="text-xs text-muted-foreground">
                          Retorno em:{" "}
                          {format(new Date(allocation.checkin_date), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-medium",
          highlight && "text-destructive flex items-center gap-1"
        )}
      >
        {highlight && <AlertTriangle className="h-3 w-3" />}
        {value}
      </span>
    </div>
  );
}

export default EquipmentDetails;
