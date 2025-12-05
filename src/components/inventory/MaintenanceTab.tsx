import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Wrench, CheckCircle, Clock, AlertTriangle, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToExcel } from "@/utils/exportUtils";
import type { UnifiedInventoryItem } from "@/hooks/useUnifiedInventory";

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
}

export default function MaintenanceTab({ equipmentItems, canManage }: MaintenanceTabProps) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    inventory_item_id: "",
    equipment_name: "",
    equipment_code: "",
    maintenance_type: "preventiva",
    priority: "media",
    status: "pendente",
    scheduled_date: "",
    completion_date: "",
    technician: "",
    description: "",
    actions_taken: "",
    parts_used: "",
    hours_spent: "",
    cost: "",
    next_maintenance: "",
  });

  useEffect(() => {
    fetchRecords();
  }, []);

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

  const handleSelectEquipment = (itemId: string) => {
    const item = equipmentItems.find((i) => i.id === itemId);
    if (item) {
      setFormData({
        ...formData,
        inventory_item_id: itemId,
        equipment_name: item.item_name,
        equipment_code: item.code || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const recordData = {
      inventory_item_id: formData.inventory_item_id || null,
      equipment_name: formData.equipment_name,
      equipment_code: formData.equipment_code,
      maintenance_type: formData.maintenance_type,
      priority: formData.priority,
      status: formData.status,
      scheduled_date: formData.scheduled_date,
      completion_date: formData.completion_date || null,
      technician: formData.technician,
      description: formData.description,
      actions_taken: formData.actions_taken || null,
      parts_used: formData.parts_used || null,
      hours_spent: formData.hours_spent ? parseFloat(formData.hours_spent) : null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      next_maintenance: formData.next_maintenance || null,
      created_by: user.id,
    };

    let error;
    if (editingRecord) {
      ({ error } = await supabase
        .from("maintenance_records")
        .update(recordData)
        .eq("id", editingRecord.id));
    } else {
      ({ error } = await supabase.from("maintenance_records").insert([recordData]));
    }

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: editingRecord ? "Registro atualizado" : "Registro criado",
      description: "Manutenção salva com sucesso",
    });

    setIsDialogOpen(false);
    resetForm();
    fetchRecords();
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormData({
      inventory_item_id: record.inventory_item_id || "",
      equipment_name: record.equipment_name,
      equipment_code: record.equipment_code,
      maintenance_type: record.maintenance_type,
      priority: record.priority,
      status: record.status,
      scheduled_date: record.scheduled_date,
      completion_date: record.completion_date || "",
      technician: record.technician,
      description: record.description,
      actions_taken: record.actions_taken || "",
      parts_used: record.parts_used || "",
      hours_spent: record.hours_spent?.toString() || "",
      cost: record.cost?.toString() || "",
      next_maintenance: record.next_maintenance || "",
    });
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

  const resetForm = () => {
    setFormData({
      inventory_item_id: "",
      equipment_name: "",
      equipment_code: "",
      maintenance_type: "preventiva",
      priority: "media",
      status: "pendente",
      scheduled_date: "",
      completion_date: "",
      technician: "",
      description: "",
      actions_taken: "",
      parts_used: "",
      hours_spent: "",
      cost: "",
      next_maintenance: "",
    });
    setEditingRecord(null);
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
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Manutenção
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRecord ? "Editar Manutenção" : "Nova Manutenção"}</DialogTitle>
                  <DialogDescription>Preencha os dados da manutenção</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Selecionar Equipamento</Label>
                      <Select value={formData.inventory_item_id} onValueChange={handleSelectEquipment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um equipamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.item_name} {item.code ? `(${item.code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Código do Equipamento</Label>
                      <Input
                        value={formData.equipment_code}
                        onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                        placeholder="Código"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome do Equipamento *</Label>
                    <Input
                      value={formData.equipment_name}
                      onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select value={formData.maintenance_type} onValueChange={(v) => setFormData({ ...formData, maintenance_type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preventiva">Preventiva</SelectItem>
                          <SelectItem value="corretiva">Corretiva</SelectItem>
                          <SelectItem value="preditiva">Preditiva</SelectItem>
                          <SelectItem value="calibracao">Calibração</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Prioridade *</Label>
                      <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Status *</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="concluida">Concluída</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data Programada *</Label>
                      <Input
                        type="date"
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Técnico Responsável *</Label>
                      <Input
                        value={formData.technician}
                        onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Conclusão</Label>
                      <Input
                        type="date"
                        value={formData.completion_date}
                        onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Próxima Manutenção</Label>
                      <Input
                        type="date"
                        value={formData.next_maintenance}
                        onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Horas Gastas</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={formData.hours_spent}
                        onChange={(e) => setFormData({ ...formData, hours_spent: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Custo (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">{editingRecord ? "Salvar" : "Criar"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
                <TableHead>Status</TableHead>
                <TableHead>Data Agendada</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(record.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
    </div>
  );
}
