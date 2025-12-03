import {
  MoreVertical,
  Edit,
  Trash2,
  LogOut,
  LogIn,
  Eye,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Equipment, EquipmentStatus, EquipmentCondition } from "@/hooks/useEquipment";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EquipmentCardProps {
  equipment: Equipment;
  onEdit: () => void;
  onDelete: () => void;
  onCheckout: () => void;
  onCheckin: () => void;
  onViewDetails: () => void;
  canManage: boolean;
}

const EquipmentCard = ({
  equipment,
  onEdit,
  onDelete,
  onCheckout,
  onCheckin,
  onViewDetails,
  canManage,
}: EquipmentCardProps) => {
  const statusConfig: Record<EquipmentStatus, { label: string; variant: string; className: string }> = {
    available: { label: "Disponível", variant: "default", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    in_service: { label: "Em Serviço", variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    maintenance: { label: "Manutenção", variant: "outline", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    calibration: { label: "Calibração", variant: "outline", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
    inactive: { label: "Inativo", variant: "destructive", className: "bg-muted text-muted-foreground" },
  };

  const conditionConfig: Record<EquipmentCondition, { label: string; className: string }> = {
    excellent: { label: "Excelente", className: "text-emerald-500" },
    good: { label: "Bom", className: "text-blue-500" },
    fair: { label: "Regular", className: "text-amber-500" },
    needs_repair: { label: "Precisa Reparo", className: "text-orange-500" },
    damaged: { label: "Danificado", className: "text-destructive" },
  };

  const calibrationDue = equipment.next_calibration
    ? differenceInDays(new Date(equipment.next_calibration), new Date())
    : null;

  const isCalibrationUrgent = calibrationDue !== null && calibrationDue <= 30;

  return (
    <Card className="group hover:shadow-md transition-shadow border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={cn("font-mono text-xs", statusConfig[equipment.status].className)}>
                {statusConfig[equipment.status].label}
              </Badge>
              {isCalibrationUrgent && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Calibração
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg leading-tight">{equipment.name}</h3>
            <p className="text-sm text-muted-foreground font-mono">{equipment.code}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              {equipment.status === "available" && (
                <DropdownMenuItem onClick={onCheckout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Check-out
                </DropdownMenuItem>
              )}
              {equipment.status === "in_service" && (
                <DropdownMenuItem onClick={onCheckin}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Check-in
                </DropdownMenuItem>
              )}
              {canManage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline" className="font-normal">
            {equipment.category}
          </Badge>
          <span className={cn("text-sm", conditionConfig[equipment.condition].className)}>
            {conditionConfig[equipment.condition].label}
          </span>
        </div>

        {equipment.current_location && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {equipment.current_location}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {equipment.manufacturer && (
            <div>
              <span className="font-medium">Fabricante:</span> {equipment.manufacturer}
            </div>
          )}
          {equipment.model && (
            <div>
              <span className="font-medium">Modelo:</span> {equipment.model}
            </div>
          )}
        </div>

        {equipment.next_calibration && (
          <div className={cn("text-xs", isCalibrationUrgent ? "text-destructive" : "text-muted-foreground")}>
            <span className="font-medium">Próx. Calibração:</span>{" "}
            {format(new Date(equipment.next_calibration), "dd/MM/yyyy", { locale: ptBR })}
            {calibrationDue !== null && ` (${calibrationDue} dias)`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentCard;
