import { useState } from "react";
import { useInventoryAuditTrail, AuditFilters } from "@/hooks/useInventoryAuditTrail";
import { InventoryAuditFilters } from "./InventoryAuditFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Settings2,
  FileDown,
  History,
  Loader2,
  AlertCircle,
  ClipboardList,
  User,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToExcel } from "@/utils/exportUtils";
import { toast } from "sonner";

export function InventoryAuditTrail() {
  const [filters, setFilters] = useState<AuditFilters>({});
  const { entries, loading, error } = useInventoryAuditTrail(filters);

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case "consumption":
        return <ArrowDownCircle className="h-4 w-4 text-destructive" />;
      case "restock":
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Settings2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case "consumption":
        return "Saída";
      case "restock":
        return "Entrada";
      default:
        return "Ajuste";
    }
  };

  const getChangeTypeBadgeVariant = (type: string): "destructive" | "default" | "secondary" => {
    switch (type) {
      case "consumption":
        return "destructive";
      case "restock":
        return "default";
      default:
        return "secondary";
    }
  };

  const getActionSourceLabel = (source: string | null) => {
    switch (source) {
      case "checklist":
        return "Checklist";
      case "checkout":
        return "Checkout";
      case "checkin":
        return "Check-in";
      default:
        return "Manual";
    }
  };

  const handleExport = () => {
    if (entries.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const exportData = entries.map((entry) => ({
      "Data/Hora": format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      Item: entry.item_name || "—",
      Tipo: getChangeTypeLabel(entry.change_type),
      "Qtd Anterior": entry.previous_quantity,
      "Qtd Nova": entry.new_quantity,
      Diferença: entry.quantity_change > 0 ? `+${entry.quantity_change}` : entry.quantity_change,
      Origem: getActionSourceLabel(entry.action_source),
      Usuário: entry.user_name || "Sistema",
      Serviço: entry.service_code || "—",
      Checklist: entry.checklist_name || "—",
      Observações: entry.notes || "—",
    }));

    exportToExcel(exportData, `historico-inventario-${format(new Date(), "yyyy-MM-dd")}`);
    toast.success("Histórico exportado com sucesso!");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center gap-2 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Histórico de Transações
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <InventoryAuditFilters filters={filters} onFiltersChange={setFilters} />

          {entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma transação encontrada</p>
              <p className="text-sm">As movimentações de estoque aparecerão aqui</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                {entries.length} transações encontradas
              </div>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Data/Hora</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[100px]">Tipo</TableHead>
                      <TableHead className="w-[80px] text-center">Anterior</TableHead>
                      <TableHead className="w-[80px] text-center">Nova</TableHead>
                      <TableHead className="w-[80px] text-center">Diferença</TableHead>
                      <TableHead className="w-[100px]">Origem</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Referência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.item_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getChangeTypeBadgeVariant(entry.change_type)} className="gap-1">
                            {getChangeTypeIcon(entry.change_type)}
                            {getChangeTypeLabel(entry.change_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {entry.previous_quantity}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {entry.new_quantity}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={
                              entry.quantity_change > 0
                                ? "text-green-600 font-medium"
                                : entry.quantity_change < 0
                                ? "text-destructive font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {entry.quantity_change > 0 ? "+" : ""}
                            {entry.quantity_change}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 text-xs">
                            {entry.action_source === "checklist" && (
                              <ClipboardList className="h-3 w-3" />
                            )}
                            {getActionSourceLabel(entry.action_source)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {entry.user_name || "Sistema"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.service_code && (
                            <span className="mr-2">🏷️ {entry.service_code}</span>
                          )}
                          {entry.checklist_name && (
                            <span>📋 {entry.checklist_name}</span>
                          )}
                          {entry.notes && !entry.service_code && !entry.checklist_name && (
                            <span title={entry.notes}>💬 {entry.notes.slice(0, 30)}...</span>
                          )}
                          {!entry.service_code && !entry.checklist_name && !entry.notes && "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

