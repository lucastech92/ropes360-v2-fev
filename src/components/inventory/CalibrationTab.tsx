import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Gauge,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Wrench,
  Search,
  Bell,
  CalendarClock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UnifiedInventoryItem } from "@/hooks/useUnifiedInventory";
import { CalibrationFormDialog } from "./calibration/CalibrationFormDialog";

interface CalibrationTabProps {
  items: UnifiedInventoryItem[];
  onRefresh: () => void;
  preSelectedItemId?: string | null;
  onClearPreselection?: () => void;
}

type CalibrationStatus = "overdue" | "urgent" | "warning" | "ok" | "no_date";

interface CalibrationItem extends UnifiedInventoryItem {
  calibrationStatus: CalibrationStatus;
  daysUntil: number | null;
}

export default function CalibrationTab({ items, onRefresh, preSelectedItemId, onClearPreselection }: CalibrationTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preselectedItem, setPreselectedItem] = useState<UnifiedInventoryItem | null>(null);

  // Process equipment items with calibration status
  const calibrationItems = useMemo(() => {
    const equipmentItems = items.filter((i) => i.item_type === "equipamento");
    const today = new Date();

    return equipmentItems.map((item): CalibrationItem => {
      if (!item.next_calibration) {
        return { ...item, calibrationStatus: "no_date", daysUntil: null };
      }

      const nextCalDate = new Date(item.next_calibration);
      const daysUntil = differenceInDays(nextCalDate, today);

      let calibrationStatus: CalibrationStatus;
      if (daysUntil < 0) {
        calibrationStatus = "overdue";
      } else if (daysUntil <= 7) {
        calibrationStatus = "urgent";
      } else if (daysUntil <= 30) {
        calibrationStatus = "warning";
      } else {
        calibrationStatus = "ok";
      }

      return { ...item, calibrationStatus, daysUntil };
    });
  }, [items]);

  // Handle preselected item from details view
  useEffect(() => {
    if (preSelectedItemId && calibrationItems.length > 0) {
      const item = calibrationItems.find(i => i.id === preSelectedItemId);
      if (item) {
        setPreselectedItem(item);
        setDialogOpen(true);
        onClearPreselection?.();
      }
    }
  }, [preSelectedItemId, calibrationItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return calibrationItems.filter((item) => {
      const matchesSearch =
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || item.calibrationStatus === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [calibrationItems, searchTerm, filterStatus]);

  // Calculate statistics
  const stats = useMemo(() => {
    const overdue = calibrationItems.filter((i) => i.calibrationStatus === "overdue").length;
    const urgent = calibrationItems.filter((i) => i.calibrationStatus === "urgent").length;
    const warning = calibrationItems.filter((i) => i.calibrationStatus === "warning").length;
    const ok = calibrationItems.filter((i) => i.calibrationStatus === "ok").length;
    const noDate = calibrationItems.filter((i) => i.calibrationStatus === "no_date").length;
    const total = calibrationItems.length;

    const complianceRate = total > 0 ? Math.round(((ok + warning) / (total - noDate)) * 100) : 0;

    return { overdue, urgent, warning, ok, noDate, total, complianceRate };
  }, [calibrationItems]);

  const getStatusBadge = (status: CalibrationStatus, daysUntil: number | null) => {
    switch (status) {
      case "overdue":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Vencida ({Math.abs(daysUntil!)} dias)
          </Badge>
        );
      case "urgent":
        return (
          <Badge className="gap-1 bg-red-500/10 text-red-600 border-red-500/20">
            <AlertCircle className="h-3 w-3" />
            Urgente ({daysUntil} dias)
          </Badge>
        );
      case "warning":
        return (
          <Badge className="gap-1 bg-orange-500/10 text-orange-600 border-orange-500/20">
            <Clock className="h-3 w-3" />
            Atenção ({daysUntil} dias)
          </Badge>
        );
      case "ok":
        return (
          <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3" />
            Em dia ({daysUntil} dias)
          </Badge>
        );
      case "no_date":
        return (
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            Sem data
          </Badge>
        );
    }
  };

  const handleOpenNewCalibration = () => {
    setPreselectedItem(null);
    setDialogOpen(true);
  };

  const handleScheduleCalibration = (item: CalibrationItem) => {
    setPreselectedItem(item);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setPreselectedItem(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>

        <Card className="border-red-400/20 bg-red-400/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Urgente (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.urgent}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Atenção (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.warning}</div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Em Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Sem Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.noDate}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conformidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.complianceRate}%</div>
            <Progress value={stats.complianceRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Alerts Banner */}
      {(stats.overdue > 0 || stats.urgent > 0) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <Bell className="h-5 w-5 text-destructive animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-destructive">Atenção: Calibrações Pendentes!</p>
                <p className="text-sm text-muted-foreground">
                  {stats.overdue > 0 && `${stats.overdue} equipamento(s) com calibração vencida. `}
                  {stats.urgent > 0 && `${stats.urgent} equipamento(s) com calibração nos próximos 7 dias.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código, fabricante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="overdue">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Vencidas
              </div>
            </SelectItem>
            <SelectItem value="urgent">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-4 w-4" />
                Urgente
              </div>
            </SelectItem>
            <SelectItem value="warning">
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="h-4 w-4" />
                Atenção
              </div>
            </SelectItem>
            <SelectItem value="ok">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                Em Dia
              </div>
            </SelectItem>
            <SelectItem value="no_date">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Sem Data
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleOpenNewCalibration} className="gap-2">
          <CalendarClock className="h-4 w-4" />
          Nova Calibração
        </Button>
      </div>

      {/* Calibration Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Equipamentos e Calibrações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Gauge className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum equipamento encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Fabricante / Modelo</TableHead>
                    <TableHead>Última Calibração</TableHead>
                    <TableHead>Próxima Calibração</TableHead>
                    <TableHead>Intervalo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className={
                        item.calibrationStatus === "overdue"
                          ? "bg-red-500/5"
                          : item.calibrationStatus === "urgent"
                          ? "bg-red-400/5"
                          : item.calibrationStatus === "warning"
                          ? "bg-orange-500/5"
                          : ""
                      }
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-muted-foreground" />
                          {item.item_name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.code || "-"}</TableCell>
                      <TableCell>
                        {item.manufacturer || "-"}
                        {item.model && ` / ${item.model}`}
                      </TableCell>
                      <TableCell>
                        {item.last_calibration
                          ? format(new Date(item.last_calibration), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {item.next_calibration
                          ? format(new Date(item.next_calibration), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {item.calibration_interval_months
                          ? `${item.calibration_interval_months} meses`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.calibrationStatus, item.daysUntil)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleScheduleCalibration(item)}
                          className="gap-1"
                        >
                          <CalendarClock className="h-4 w-4" />
                          Agendar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Calibration Form Dialog */}
      <CalibrationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        items={items}
        onSuccess={handleSuccess}
        preselectedItem={preselectedItem}
      />
    </div>
  );
}

