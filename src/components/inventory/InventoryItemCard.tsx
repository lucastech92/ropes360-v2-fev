import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit,
  Trash2,
  LogOut,
  LogIn,
  Eye,
  AlertTriangle,
  Package,
  Wrench,
  Calendar,
} from "lucide-react";
import type { UnifiedInventoryItem, EquipmentStatus, EquipmentCondition } from "@/hooks/useUnifiedInventory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InventoryItemCardProps {
  item: UnifiedInventoryItem;
  onEdit: (item: UnifiedInventoryItem) => void;
  onDelete: (id: string) => void;
  onCheckout?: (item: UnifiedInventoryItem) => void;
  onCheckin?: (item: UnifiedInventoryItem) => void;
  onViewDetails?: (item: UnifiedInventoryItem) => void;
  canManage: boolean;
  canDelete?: boolean;
}

const statusConfig: Record<EquipmentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  available: { label: "Disponível", variant: "default", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  in_service: { label: "Em Serviço", variant: "secondary", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  maintenance: { label: "Manutenção", variant: "destructive", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  calibration: { label: "Calibração", variant: "outline", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  inactive: { label: "Inativo", variant: "outline", className: "bg-muted text-muted-foreground" },
};

const conditionConfig: Record<EquipmentCondition, { label: string; className: string }> = {
  excellent: { label: "Excelente", className: "text-green-600" },
  good: { label: "Bom", className: "text-blue-600" },
  fair: { label: "Regular", className: "text-yellow-600" },
  needs_repair: { label: "Precisa Reparo", className: "text-orange-600" },
  damaged: { label: "Danificado", className: "text-red-600" },
};

export default function InventoryItemCard({
  item,
  onEdit,
  onDelete,
  onCheckout,
  onCheckin,
  onViewDetails,
  canManage,
}: InventoryItemCardProps) {
  const isEquipment = item.item_type === "equipamento";
  const isLowStock = !isEquipment && item.min_quantity && item.quantity <= item.min_quantity;
  
  const calibrationDue = item.next_calibration ? new Date(item.next_calibration) : null;
  const isCalibrationUrgent = calibrationDue && calibrationDue <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click if clicking on dropdown or buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menu"]')) {
      return;
    }
    onViewDetails?.(item);
  };

  return (
    <Card 
      className={`
        ${isLowStock ? "border-destructive/50 bg-destructive/5" : ""}
        cursor-pointer transition-all duration-200 
        hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/30
        group
      `}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              {isEquipment ? (
                <Wrench className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              ) : (
                <Package className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">{item.item_name}</CardTitle>
            </div>
            {isEquipment && item.code && (
              <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
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
            {isCalibrationUrgent && (
              <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-600 border-orange-500/20">
                <Calendar className="h-3 w-3" />
                Calibração Próxima
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(item)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                
                {isEquipment && item.status === "available" && onCheckout && (
                  <DropdownMenuItem onClick={() => onCheckout(item)}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Check-out
                  </DropdownMenuItem>
                )}
                
                {isEquipment && item.status === "in_service" && onCheckin && (
                  <DropdownMenuItem onClick={() => onCheckin(item)}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Check-in
                  </DropdownMenuItem>
                )}

                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(item.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {item.category && (
            <div>
              <span className="text-muted-foreground">Categoria:</span>{" "}
              <span>{item.category}</span>
            </div>
          )}

          {!isEquipment && (
            <div>
              <span className="text-muted-foreground">Quantidade:</span>{" "}
              <span className={isLowStock ? "text-destructive font-semibold" : ""}>
                {item.quantity} {item.unit || ""}
              </span>
            </div>
          )}

          {isEquipment && item.condition && (
            <div>
              <span className="text-muted-foreground">Condição:</span>{" "}
              <span className={conditionConfig[item.condition].className}>
                {conditionConfig[item.condition].label}
              </span>
            </div>
          )}

          {isEquipment && item.current_location && (
            <div>
              <span className="text-muted-foreground">Local:</span>{" "}
              <span>{item.current_location}</span>
            </div>
          )}

          {!isEquipment && item.location && (
            <div>
              <span className="text-muted-foreground">Local:</span>{" "}
              <span>{item.location}</span>
            </div>
          )}

          {isEquipment && item.manufacturer && (
            <div>
              <span className="text-muted-foreground">Fabricante:</span>{" "}
              <span>{item.manufacturer}</span>
            </div>
          )}

          {isEquipment && item.model && (
            <div>
              <span className="text-muted-foreground">Modelo:</span>{" "}
              <span>{item.model}</span>
            </div>
          )}

          {isEquipment && item.next_calibration && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Próx. Calibração:</span>{" "}
              <span className={isCalibrationUrgent ? "text-orange-600 font-semibold" : ""}>
                {format(new Date(item.next_calibration), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
