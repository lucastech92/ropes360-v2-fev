import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Package,
  Wrench,
  MapPin,
  Calendar,
  AlertTriangle,
  LogOut,
  LogIn,
  Edit,
  History,
  Gauge,
  Clock,
  Building,
  Hash,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  CalendarClock,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { UnifiedInventoryItem, EquipmentStatus, EquipmentCondition, InventoryAllocation } from "@/hooks/useUnifiedInventory";

interface InventoryItemDetailsProps {
  item: UnifiedInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: UnifiedInventoryItem) => void;
  onCheckout?: (item: UnifiedInventoryItem) => void;
  onCheckin?: (item: UnifiedInventoryItem) => void;
  canManage: boolean;
  onNewMaintenance?: (item: UnifiedInventoryItem) => void;
  onNewCalibration?: (item: UnifiedInventoryItem) => void;
}

const statusConfig: Record<EquipmentStatus, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  in_service: { label: "Em Serviço", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  maintenance: { label: "Manutenção", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  calibration: { label: "Calibração", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  inactive: { label: "Inativo", className: "bg-muted text-muted-foreground" },
};

const conditionConfig: Record<EquipmentCondition, { label: string; className: string }> = {
  excellent: { label: "Excelente", className: "text-green-600" },
  good: { label: "Bom", className: "text-blue-600" },
  fair: { label: "Regular", className: "text-yellow-600" },
  needs_repair: { label: "Precisa Reparo", className: "text-orange-600" },
  damaged: { label: "Danificado", className: "text-red-600" },
};

interface MaintenanceRecord {
  id: string;
  maintenance_type: string;
  status: string;
  priority: string;
  scheduled_date: string;
  completion_date: string | null;
  technician: string;
  description: string;
}

interface CalibrationHistory {
  id: string;
  last_calibration: string | null;
  next_calibration: string | null;
  calibration_interval_months: number | null;
}

export default function InventoryItemDetails({
  item,
  open,
  onOpenChange,
  onEdit,
  onCheckout,
  onCheckin,
  canManage,
  onNewMaintenance,
  onNewCalibration,
}: InventoryItemDetailsProps) {
  const [allocations, setAllocations] = useState<InventoryAllocation[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item && item.item_type === "equipamento" && open) {
      fetchAllocations();
      fetchMaintenance();
    }
  }, [item, open]);

  const fetchAllocations = async () => {
    if (!item) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_allocations")
        .select("*")
        .eq("inventory_item_id", item.id)
        .order("checkout_date", { ascending: false });

      if (error) throw error;
      setAllocations(data || []);
    } catch (error) {
      console.error("Error fetching allocations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenance = async () => {
    if (!item) return;
    try {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select("*")
        .eq("inventory_item_id", item.id)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      setMaintenanceRecords(data || []);
    } catch (error) {
      console.error("Error fetching maintenance:", error);
    }
  };

  if (!item) return null;

  const isEquipment = item.item_type === "equipamento";
  const isLowStock = !isEquipment && item.min_quantity && item.quantity <= item.min_quantity;
  const calibrationDue = item.next_calibration ? new Date(item.next_calibration) : null;
  const isCalibrationUrgent = calibrationDue && calibrationDue <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isCalibrationOverdue = calibrationDue && calibrationDue < new Date();

  const getMaintenanceStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Pendente</Badge>;
      case "em_andamento":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Em Andamento</Badge>;
      case "concluido":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">Concluído</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            {isEquipment ? (
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-green-500/10">
                <Package className="h-5 w-5 text-green-600" />
              </div>
            )}
            <div className="flex-1">
              <SheetTitle className="text-xl">{item.item_name}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.code && <span className="font-mono text-xs">{item.code}</span>}
                  {isEquipment && item.status && (
                    <Badge className={statusConfig[item.status].className}>
                      {statusConfig[item.status].label}
                    </Badge>
                  )}
                  {isLowStock && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Estoque Baixo
                    </Badge>
                  )}
                  {isCalibrationOverdue && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Calibração Vencida
                    </Badge>
                  )}
                  {isCalibrationUrgent && !isCalibrationOverdue && (
                    <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-600 border-orange-500/20">
                      <Calendar className="h-3 w-3" />
                      Calibração Próxima
                    </Badge>
                  )}
                </div>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            {isEquipment && item.status === "available" && onCheckout && (
              <Button onClick={() => onCheckout(item)} className="flex-1">
                <LogOut className="h-4 w-4 mr-2" />
                Check-out
              </Button>
            )}
            {isEquipment && item.status === "in_service" && onCheckin && (
              <Button onClick={() => onCheckin(item)} variant="secondary" className="flex-1">
                <LogIn className="h-4 w-4 mr-2" />
                Check-in
              </Button>
            )}
            {canManage && (
              <Button onClick={() => onEdit(item)} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className={`grid w-full ${isEquipment ? "grid-cols-4" : "grid-cols-1"}`}>
              <TabsTrigger value="info" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Informações</span>
              </TabsTrigger>
              {isEquipment && (
                <>
                  <TabsTrigger value="allocations" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">Alocações</span>
                  </TabsTrigger>
                  <TabsTrigger value="maintenance" className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline">Manutenções</span>
                  </TabsTrigger>
                  <TabsTrigger value="calibrations" className="flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    <span className="hidden sm:inline">Calibrações</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-4">
                  {/* Photo */}
                  {item.photo_url && (
                    <div className="rounded-lg overflow-hidden border">
                      <img
                        src={item.photo_url}
                        alt={item.item_name}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}

                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Categoria</p>
                        <p className="font-medium">{item.category || "-"}</p>
                      </div>
                    </div>

                    {!isEquipment && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Quantidade</p>
                          <p className={`font-medium ${isLowStock ? "text-destructive" : ""}`}>
                            {item.quantity} {item.unit || ""}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Localização</p>
                        <p className="font-medium">{isEquipment ? item.current_location : item.location || "-"}</p>
                      </div>
                    </div>

                    {isEquipment && item.condition && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Condição</p>
                          <p className={`font-medium ${conditionConfig[item.condition].className}`}>
                            {conditionConfig[item.condition].label}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Equipment Details */}
                  {isEquipment && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Detalhes do Equipamento
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {item.manufacturer && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Fabricante</p>
                              <p className="font-medium">{item.manufacturer}</p>
                            </div>
                          </div>
                        )}

                        {item.model && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Modelo</p>
                              <p className="font-medium">{item.model}</p>
                            </div>
                          </div>
                        )}

                        {item.serial_number && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Nº Série</p>
                              <p className="font-medium font-mono">{item.serial_number}</p>
                            </div>
                          </div>
                        )}

                        {item.acquisition_date && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Data Aquisição</p>
                              <p className="font-medium">
                                {format(new Date(item.acquisition_date), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Calibration Section */}
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mt-4">
                        Calibração
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {item.last_calibration && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Última Calibração</p>
                              <p className="font-medium">
                                {format(new Date(item.last_calibration), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        )}

                        {item.next_calibration && (
                          <div className={`flex items-center gap-2 p-3 rounded-lg ${isCalibrationOverdue ? "bg-destructive/10" : isCalibrationUrgent ? "bg-orange-500/10" : "bg-muted/50"}`}>
                            <Clock className={`h-4 w-4 ${isCalibrationOverdue ? "text-destructive" : isCalibrationUrgent ? "text-orange-600" : "text-muted-foreground"}`} />
                            <div>
                              <p className="text-xs text-muted-foreground">Próxima Calibração</p>
                              <p className={`font-medium ${isCalibrationOverdue ? "text-destructive" : isCalibrationUrgent ? "text-orange-600" : ""}`}>
                                {format(new Date(item.next_calibration), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        )}

                        {item.calibration_interval_months && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 col-span-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Intervalo de Calibração</p>
                              <p className="font-medium">{item.calibration_interval_months} meses</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm">{item.notes}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {isEquipment && (
              <>
                <TabsContent value="allocations" className="mt-4">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : allocations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma alocação registrada</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allocations.map((allocation) => (
                          <div key={allocation.id} className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {allocation.checkin_date ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Clock className="h-4 w-4 text-blue-600" />
                                )}
                                <span className="font-medium">
                                  {allocation.checkin_date ? "Retornado" : "Em uso"}
                                </span>
                              </div>
                              {allocation.destination && (
                                <Badge variant="outline">{allocation.destination}</Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Saída:</span>{" "}
                                {format(new Date(allocation.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </div>
                              {allocation.checkin_date && (
                                <div>
                                  <span className="text-muted-foreground">Retorno:</span>{" "}
                                  {format(new Date(allocation.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Condição Saída:</span>{" "}
                                <span className={conditionConfig[allocation.condition_on_checkout].className}>
                                  {conditionConfig[allocation.condition_on_checkout].label}
                                </span>
                              </div>
                              {allocation.condition_on_checkin && (
                                <div>
                                  <span className="text-muted-foreground">Condição Retorno:</span>{" "}
                                  <span className={conditionConfig[allocation.condition_on_checkin].className}>
                                    {conditionConfig[allocation.condition_on_checkin].label}
                                  </span>
                                </div>
                              )}
                            </div>

                            {allocation.checkout_notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                <strong>Obs. saída:</strong> {allocation.checkout_notes}
                              </p>
                            )}
                            {allocation.checkin_notes && (
                              <p className="text-sm text-muted-foreground">
                                <strong>Obs. retorno:</strong> {allocation.checkin_notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="maintenance" className="mt-4">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    {/* Add Maintenance Button */}
                    {canManage && onNewMaintenance && (
                      <div className="mb-4">
                        <Button 
                          onClick={() => {
                            onOpenChange(false);
                            onNewMaintenance(item);
                          }}
                          className="w-full gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Nova Manutenção
                        </Button>
                      </div>
                    )}
                    
                    {maintenanceRecords.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma manutenção registrada</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {maintenanceRecords.map((record) => (
                          <div key={record.id} className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium capitalize">{record.maintenance_type}</span>
                              {getMaintenanceStatusBadge(record.status)}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">{record.description}</p>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Agendada:</span>{" "}
                                {format(new Date(record.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                              {record.completion_date && (
                                <div>
                                  <span className="text-muted-foreground">Concluída:</span>{" "}
                                  {format(new Date(record.completion_date), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Técnico:</span>{" "}
                                {record.technician}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Prioridade:</span>{" "}
                                <span className={
                                  record.priority === "alta" ? "text-destructive" :
                                  record.priority === "media" ? "text-orange-600" :
                                  "text-muted-foreground"
                                }>
                                  {record.priority.charAt(0).toUpperCase() + record.priority.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Calibrations Tab */}
                <TabsContent value="calibrations" className="mt-4">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    {/* Add Calibration Button */}
                    {canManage && onNewCalibration && (
                      <div className="mb-4">
                        <Button 
                          onClick={() => {
                            onOpenChange(false);
                            onNewCalibration(item);
                          }}
                          className="w-full gap-2"
                        >
                          <CalendarClock className="h-4 w-4" />
                          Nova Calibração
                        </Button>
                      </div>
                    )}

                    {/* Calibration Status Card */}
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border ${
                        isCalibrationOverdue ? "bg-destructive/10 border-destructive/30" :
                        isCalibrationUrgent ? "bg-orange-500/10 border-orange-500/30" :
                        "bg-green-500/10 border-green-500/30"
                      }`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-full ${
                            isCalibrationOverdue ? "bg-destructive/20" :
                            isCalibrationUrgent ? "bg-orange-500/20" :
                            "bg-green-500/20"
                          }`}>
                            <Gauge className={`h-5 w-5 ${
                              isCalibrationOverdue ? "text-destructive" :
                              isCalibrationUrgent ? "text-orange-600" :
                              "text-green-600"
                            }`} />
                          </div>
                          <div>
                            <h4 className="font-semibold">Status da Calibração</h4>
                            <p className={`text-sm ${
                              isCalibrationOverdue ? "text-destructive" :
                              isCalibrationUrgent ? "text-orange-600" :
                              "text-green-600"
                            }`}>
                              {isCalibrationOverdue ? "⚠️ Calibração Vencida" :
                               isCalibrationUrgent ? "⏰ Calibração Próxima do Vencimento" :
                               calibrationDue ? "✓ Calibração em Dia" : "Sem data definida"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-background/50">
                            <p className="text-xs text-muted-foreground">Última Calibração</p>
                            <p className="font-medium">
                              {item.last_calibration
                                ? format(new Date(item.last_calibration), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/50">
                            <p className="text-xs text-muted-foreground">Próxima Calibração</p>
                            <p className={`font-medium ${
                              isCalibrationOverdue ? "text-destructive" :
                              isCalibrationUrgent ? "text-orange-600" : ""
                            }`}>
                              {item.next_calibration
                                ? format(new Date(item.next_calibration), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </p>
                          </div>
                          {item.calibration_interval_months && (
                            <div className="p-3 rounded-lg bg-background/50 col-span-2">
                              <p className="text-xs text-muted-foreground">Intervalo de Calibração</p>
                              <p className="font-medium">{item.calibration_interval_months} meses</p>
                            </div>
                          )}
                          {calibrationDue && (
                            <div className="p-3 rounded-lg bg-background/50 col-span-2">
                              <p className="text-xs text-muted-foreground">Dias até Vencimento</p>
                              <p className={`font-medium ${
                                isCalibrationOverdue ? "text-destructive" :
                                isCalibrationUrgent ? "text-orange-600" : ""
                              }`}>
                                {isCalibrationOverdue 
                                  ? `${Math.abs(differenceInDays(calibrationDue, new Date()))} dias atrasado`
                                  : `${differenceInDays(calibrationDue, new Date())} dias restantes`
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

