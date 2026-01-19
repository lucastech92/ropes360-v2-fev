import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wrench, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Hash, 
  Building, 
  Tag,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UnifiedInventoryItem } from "@/hooks/useUnifiedInventory";

interface EquipmentInfoCardProps {
  item: UnifiedInventoryItem;
}

export default function EquipmentInfoCard({ item }: EquipmentInfoCardProps) {
  const getStatusBadge = (status: string | null) => {
    const config: Record<string, { label: string; className: string }> = {
      available: { label: "Disponível", className: "bg-green-500/10 text-green-600 border-green-500/20" },
      in_service: { label: "Em Serviço", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      maintenance: { label: "Manutenção", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
      calibration: { label: "Calibração", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      inactive: { label: "Inativo", className: "bg-muted text-muted-foreground" },
    };
    const { label, className } = config[status || "available"] || config.available;
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  const getConditionBadge = (condition: string | null) => {
    const config: Record<string, { label: string; className: string }> = {
      excellent: { label: "Excelente", className: "bg-green-500/10 text-green-600" },
      good: { label: "Bom", className: "bg-blue-500/10 text-blue-600" },
      fair: { label: "Regular", className: "bg-yellow-500/10 text-yellow-600" },
      needs_repair: { label: "Precisa Reparo", className: "bg-orange-500/10 text-orange-600" },
      damaged: { label: "Danificado", className: "bg-red-500/10 text-red-600" },
    };
    const { label, className } = config[condition || "good"] || config.good;
    return <Badge className={className}>{label}</Badge>;
  };

  const getCalibrationStatus = () => {
    if (!item.next_calibration) return null;
    const nextDate = new Date(item.next_calibration);
    const today = new Date();
    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return { type: "overdue", days: Math.abs(daysUntil), message: `Calibração vencida há ${Math.abs(daysUntil)} dias` };
    } else if (daysUntil <= 7) {
      return { type: "urgent", days: daysUntil, message: `Calibração vence em ${daysUntil} dias` };
    } else if (daysUntil <= 30) {
      return { type: "warning", days: daysUntil, message: `Calibração vence em ${daysUntil} dias` };
    }
    return null;
  };

  const calibrationStatus = getCalibrationStatus();
  const isInMaintenance = item.status === "maintenance";
  const needsRepair = item.condition === "needs_repair" || item.condition === "damaged";

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Informações do Equipamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Nome</div>
            <div className="font-medium">{item.item_name}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs flex items-center gap-1">
              <Hash className="h-3 w-3" /> Código
            </div>
            <div className="font-medium">{item.code || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs flex items-center gap-1">
              <Building className="h-3 w-3" /> Fabricante
            </div>
            <div className="font-medium">{item.manufacturer || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs flex items-center gap-1">
              <Tag className="h-3 w-3" /> Modelo
            </div>
            <div className="font-medium">{item.model || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Nº Série</div>
            <div className="font-medium">{item.serial_number || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Localização
            </div>
            <div className="font-medium">{item.current_location || item.location || "—"}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            {getStatusBadge(item.status)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Condição:</span>
            {getConditionBadge(item.condition)}
          </div>
        </div>

        {(item.last_calibration || item.next_calibration) && (
          <div className="flex flex-wrap gap-4 pt-2 border-t text-sm">
            {item.last_calibration && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Última:</span>
                <span>{format(new Date(item.last_calibration), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            )}
            {item.next_calibration && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Próxima:</span>
                <span>{format(new Date(item.next_calibration), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            )}
          </div>
        )}

        {/* Alerts */}
        {(isInMaintenance || needsRepair || calibrationStatus) && (
          <div className="space-y-2 pt-2">
            {isInMaintenance && (
              <Alert className="py-2 bg-yellow-500/10 border-yellow-500/30">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700 text-sm ml-2">
                  Este equipamento já está em manutenção
                </AlertDescription>
              </Alert>
            )}
            {needsRepair && (
              <Alert className="py-2 bg-orange-500/10 border-orange-500/30">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700 text-sm ml-2">
                  Equipamento {item.condition === "damaged" ? "danificado" : "precisa de reparo"}
                </AlertDescription>
              </Alert>
            )}
            {calibrationStatus && (
              <Alert className={`py-2 ${
                calibrationStatus.type === "overdue" 
                  ? "bg-red-500/10 border-red-500/30" 
                  : calibrationStatus.type === "urgent"
                  ? "bg-orange-500/10 border-orange-500/30"
                  : "bg-yellow-500/10 border-yellow-500/30"
              }`}>
                <AlertCircle className={`h-4 w-4 ${
                  calibrationStatus.type === "overdue" 
                    ? "text-red-600" 
                    : calibrationStatus.type === "urgent"
                    ? "text-orange-600"
                    : "text-yellow-600"
                }`} />
                <AlertDescription className={`text-sm ml-2 ${
                  calibrationStatus.type === "overdue" 
                    ? "text-red-700" 
                    : calibrationStatus.type === "urgent"
                    ? "text-orange-700"
                    : "text-yellow-700"
                }`}>
                  {calibrationStatus.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
