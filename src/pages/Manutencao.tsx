import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportToExcel } from "@/utils/exportUtils";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Calendar, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Edit,
  Trash2,
  Filter,
  Search,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type MaintenanceRecord = Database['public']['Tables']['maintenance_records']['Row'];

const Manutencao = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<{
    equipment_name: string;
    equipment_code: string;
    maintenance_type: 'preventiva' | 'corretiva' | 'preditiva';
    priority: 'baixa' | 'media' | 'alta' | 'urgente';
    status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
    scheduled_date: string;
    completion_date: string;
    technician: string;
    description: string;
    actions_taken: string;
    parts_used: string;
    hours_spent: string;
    cost: string;
    next_maintenance: string;
  }>({
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
    next_maintenance: ""
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [records, searchTerm, filterType, filterStatus]);

  const handleExport = () => {
    const exportData = filteredRecords.map(r => ({
      'Equipamento': r.equipment_name,
      'Código': r.equipment_code,
      'Tipo': r.maintenance_type,
      'Prioridade': r.priority,
      'Status': r.status,
      'Data Agendada': r.scheduled_date,
      'Data Conclusão': r.completion_date || '',
      'Técnico': r.technician,
      'Custo': r.cost || '',
      'Horas': r.hours_spent || '',
    }));
    exportToExcel(exportData, `manutencao_${new Date().toISOString().split('T')[0]}`, 'Manutenção');
  };

  useKeyboardShortcuts([
    { key: 'n', ctrl: true, callback: () => setIsDialogOpen(true), description: 'Nova manutenção' },
    { key: 'e', ctrl: true, callback: handleExport, description: 'Exportar manutenções' },
  ]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar registros",
        description: "Não foi possível carregar os registros de manutenção.",
        variant: "destructive"
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.equipment_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.technician.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter(record => record.maintenance_type === filterType);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(record => record.status === filterStatus);
    }

    setFilteredRecords(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const recordData = {
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
        created_by: user.id
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('maintenance_records')
          .update(recordData)
          .eq('id', editingRecord.id);

        if (error) throw error;

        toast({
          title: "Registro atualizado",
          description: "O registro de manutenção foi atualizado com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('maintenance_records')
          .insert([recordData]);

        if (error) throw error;

        toast({
          title: "Registro criado",
          description: "O registro de manutenção foi criado com sucesso."
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchRecords();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o registro de manutenção.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormData({
      equipment_name: record.equipment_name,
      equipment_code: record.equipment_code,
      maintenance_type: record.maintenance_type as 'preventiva' | 'corretiva' | 'preditiva',
      priority: record.priority as 'baixa' | 'media' | 'alta' | 'urgente',
      status: record.status as 'pendente' | 'em_andamento' | 'concluida' | 'cancelada',
      scheduled_date: record.scheduled_date,
      completion_date: record.completion_date || "",
      technician: record.technician,
      description: record.description,
      actions_taken: record.actions_taken || "",
      parts_used: record.parts_used || "",
      hours_spent: record.hours_spent?.toString() || "",
      cost: record.cost?.toString() || "",
      next_maintenance: record.next_maintenance || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;

    try {
      const { error } = await supabase
        .from('maintenance_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Registro excluído",
        description: "O registro de manutenção foi excluído com sucesso."
      });

      fetchRecords();
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o registro.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
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
      next_maintenance: ""
    });
    setEditingRecord(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { variant: "outline" as const, icon: Clock, label: "Pendente" },
      em_andamento: { variant: "default" as const, icon: Wrench, label: "Em Andamento" },
      concluida: { variant: "default" as const, icon: CheckCircle, label: "Concluída" },
      cancelada: { variant: "destructive" as const, icon: AlertTriangle, label: "Cancelada" }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      baixa: { className: "bg-muted text-muted-foreground", label: "Baixa" },
      media: { className: "bg-muted text-muted-foreground", label: "Média" },
      alta: { className: "bg-muted text-muted-foreground", label: "Alta" },
      urgente: { className: "bg-muted text-muted-foreground", label: "Urgente" }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig];

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      preventiva: { className: "bg-muted text-muted-foreground", label: "Preventiva" },
      corretiva: { className: "bg-muted text-muted-foreground", label: "Corretiva" },
      preditiva: { className: "bg-muted text-muted-foreground", label: "Preditiva" }
    };

    const config = typeConfig[type as keyof typeof typeConfig];

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const stats = {
    total: records.length,
    pendente: records.filter(r => r.status === 'pendente').length,
    em_andamento: records.filter(r => r.status === 'em_andamento').length,
    concluida: records.filter(r => r.status === 'concluida').length
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Controle de Manutenção</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie manutenções preventivas, corretivas e preditivas
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Manutenção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRecord ? "Editar Manutenção" : "Nova Manutenção"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados da manutenção
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                    <TabsTrigger value="execution">Execução</TabsTrigger>
                    <TabsTrigger value="details">Detalhes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="equipment_name">Nome do Equipamento *</Label>
                        <Input
                          id="equipment_name"
                          value={formData.equipment_name}
                          onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="equipment_code">Código do Equipamento *</Label>
                        <Input
                          id="equipment_code"
                          value={formData.equipment_code}
                          onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maintenance_type">Tipo de Manutenção *</Label>
                        <Select
                          value={formData.maintenance_type}
                          onValueChange={(value: any) => setFormData({ ...formData, maintenance_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preventiva">Preventiva</SelectItem>
                            <SelectItem value="corretiva">Corretiva</SelectItem>
                            <SelectItem value="preditiva">Preditiva</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority">Prioridade *</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                        >
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
                        <Label htmlFor="status">Status *</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                        >
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
                        <Label htmlFor="scheduled_date">Data Programada *</Label>
                        <Input
                          id="scheduled_date"
                          type="date"
                          value={formData.scheduled_date}
                          onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="technician">Técnico Responsável *</Label>
                        <Input
                          id="technician"
                          value={formData.technician}
                          onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição do Problema/Serviço *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        required
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="execution" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="completion_date">Data de Conclusão</Label>
                      <Input
                        id="completion_date"
                        type="date"
                        value={formData.completion_date}
                        onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="actions_taken">Ações Realizadas</Label>
                      <Textarea
                        id="actions_taken"
                        value={formData.actions_taken}
                        onChange={(e) => setFormData({ ...formData, actions_taken: e.target.value })}
                        rows={3}
                        placeholder="Descreva as ações realizadas durante a manutenção..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="parts_used">Peças Utilizadas</Label>
                      <Textarea
                        id="parts_used"
                        value={formData.parts_used}
                        onChange={(e) => setFormData({ ...formData, parts_used: e.target.value })}
                        rows={2}
                        placeholder="Liste as peças e materiais utilizados..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hours_spent">Horas Gastas</Label>
                        <Input
                          id="hours_spent"
                          type="number"
                          step="0.5"
                          value={formData.hours_spent}
                          onChange={(e) => setFormData({ ...formData, hours_spent: e.target.value })}
                          placeholder="0.0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cost">Custo (R$)</Label>
                        <Input
                          id="cost"
                          type="number"
                          step="0.01"
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="next_maintenance">Próxima Manutenção</Label>
                      <Input
                        id="next_maintenance"
                        type="date"
                        value={formData.next_maintenance}
                        onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingRecord ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendente}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.em_andamento}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.concluida}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Registros de Manutenção</CardTitle>
                <CardDescription>Histórico completo de manutenções</CardDescription>
              </div>

              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="preventiva">Preventiva</SelectItem>
                    <SelectItem value="corretiva">Corretiva</SelectItem>
                    <SelectItem value="preditiva">Preditiva</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Programada</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.equipment_name}</TableCell>
                      <TableCell>{record.equipment_code}</TableCell>
                      <TableCell>{getTypeBadge(record.maintenance_type)}</TableCell>
                      <TableCell>{getPriorityBadge(record.priority)}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {format(new Date(record.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{record.technician}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Manutencao;
