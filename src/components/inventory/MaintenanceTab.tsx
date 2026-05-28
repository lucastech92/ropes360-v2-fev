import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Wrench, CheckCircle, Clock, AlertTriangle, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToExcel } from "@/utils/exportUtils";
import type { UnifiedInventoryItem } from "@/hooks/useUnifiedInventory";
import MaintenanceFormDialog from "./maintenance/MaintenanceFormDialog";

interface MaintenanceRecord {
  id: string;
  inventory_item_id: string | null;
  equipment_name: string;
  equipment_code: string;
  maintenance_type: string;
  priority: string;
  status: string;
  scheduled_date: string;
  completion_date: string | null;
  technician: string;
  description: string;
  actions_taken: string | null;
  parts_used: string | null;
  hours_spent: number | null;
  cost: number | null;
  next_maintenance: string | null;
}

interface MaintenanceTabProps {
  equipmentItems: UnifiedInventoryItem[];
  canManage: boolean;
  canDelete?: boolean;
  preSelectedItemId?: string | null;
  onClearPreselection?: () => void;
}

export default function MaintenanceTab({
  equipmentItems,
  canManage,
  canDelete = false,
  preSelectedItemId,
  onClearPreselection
}: MaintenanceTabProps) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [preselectedItem, setPreselectedItem] = useState<UnifiedInventoryItem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecords();
  }, []);

  // Handle preselection from item details
  useEffect(() => {
    if (preSelectedItemId && equipmentItems.length > 0) {
      const item = equipmentItems.find(i => i.id === preSelectedItemId);
      if (item) {
        setPreselectedItem(item);
        setIsDialogOpen(true);
        onClearPreselection?.();
      }
    }
  }, [preSelectedItemId, equipmentItems]);

  useEffect(() => {
    applyFilters();
  }, [records, searchTerm, filterStatus, filterType]);

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from("maintenance_records")
      .select("*")
      .order("scheduled_date", { ascending: false });

    if (!error && data) {
      setRecords(data as MaintenanceRecord[]);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.equipment_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.technician.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    if (filterType !== "all") {
      filtered = filtered.filter((r) => r.maintenance_type === filterType);
    }

    setFilteredRecords(filtered);
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;

    const { error } = await supabase.from("maintenance_records").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Registro excluído",
      description: "Manutenção removida com sucesso",
    });

    fetchRecords();
  };

  const handleExport = () => {
    const exportData = filteredRecords.map((r) => ({
      Equipamento: r.equipment_name,
      Código: r.equipment_code,
      Tipo: r.maintenance_type,
      Prioridade: r.priority,
      Status: r.status,
      "Data Agendada": r.scheduled_date,
      "Data Conclusão": r.completion_date || "",
      Técnico: r.technician,
      Custo: r.cost || "",
      Horas: r.hours_spent || "",
    }));
    exportToExcel(exportData, `manutencao_${new Date().toISOString().split("T")[0]}`, "Manutenção");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; label: string; className: string }> = {
      pendente: { icon: Clock, label: "Pendente", className: "bg-yellow-500/10 text-yellow-600" },
      em_andamento: { icon: Wrench, label: "Em Andamento", className: "bg-blue-500 text-white" },
      concluida: { icon: CheckCircle, label: "Concluída", className: "bg-green-500/10 text-green-600" },
      cancelada: { icon: AlertTriangle, label: "Cancelada", className: "bg-red-500/10 text-red-600" },
    };
    const { icon: Icon, label, className } = config[status] || config.pendente;
    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: string; className: string }> = {
      baixa: { label: "Baixa", className: "bg-muted text-muted-foreground" },
      media: { label: "Média", className: "bg-blue-500/10 text-blue-600" },
      alta: { label: "Alta", className: "bg-orange-500/10 text-orange-600" },
      urgente: { label: "Urgente", className: "bg-red-500/10 text-red-600" },
    };
    const { label, className } = config[priority] || config.media;
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  const stats = {
    total: records.length,
    pendente: records.filter((r) => r.status === "pendente").length,
    em_andamento: records.filter((r) => r.status === "em_andamento").length,
    concluida: records.filter((r) => r.status === "concluida").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendente}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.em_andamento}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.concluida}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por equipamento, código, técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="preventiva">Preventiva</SelectItem>
            <SelectItem value="corretiva">Corretiva</SelectItem>
            <SelectItem value="preditiva">Preditiva</SelectItem>
            <SelectItem value="calibracao">Calibração</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={handleExport} disabled={filteredRecords.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          {canManage && (
            <Button onClick={() => { setEditingRecord(null); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Manutenção
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Agendada</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum registro de manutenção encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.equipment_name}</div>
                        <div className="text-xs text-muted-foreground">{record.equipment_code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.maintenance_type}</Badge>
                    </TableCell>
                    <TableCell>{getPriorityBadge(record.priority)}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      {format(new Date(record.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{record.technician}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canManage && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(record)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(record.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <MaintenanceFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setPreselectedItem(null);
          }
        }}
        equipmentItems={equipmentItems}
        editingRecord={editingRecord}
        onSuccess={fetchRecords}
        preselectedItem={preselectedItem}
      />
    </div>
  );
}
