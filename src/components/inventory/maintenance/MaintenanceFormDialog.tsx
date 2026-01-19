import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wrench, Calendar, FileText, DollarSign } from "lucide-react";
import { addMonths, format } from "date-fns";
import type { UnifiedInventoryItem } from "@/hooks/useUnifiedInventory";
import EquipmentInfoCard from "./EquipmentInfoCard";
import MaintenanceHistoryCard from "./MaintenanceHistoryCard";
import TechnicianSelect from "./TechnicianSelect";

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

interface MaintenanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentItems: UnifiedInventoryItem[];
  editingRecord: MaintenanceRecord | null;
  onSuccess: () => void;
  preselectedItem?: UnifiedInventoryItem | null;
}

const initialFormData = {
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
};

export default function MaintenanceFormDialog({
  open,
  onOpenChange,
  equipmentItems,
  editingRecord,
  onSuccess,
  preselectedItem,
}: MaintenanceFormDialogProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [selectedItem, setSelectedItem] = useState<UnifiedInventoryItem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        inventory_item_id: editingRecord.inventory_item_id || "",
        equipment_name: editingRecord.equipment_name,
        equipment_code: editingRecord.equipment_code,
        maintenance_type: editingRecord.maintenance_type,
        priority: editingRecord.priority,
        status: editingRecord.status,
        scheduled_date: editingRecord.scheduled_date,
        completion_date: editingRecord.completion_date || "",
        technician: editingRecord.technician,
        description: editingRecord.description,
        actions_taken: editingRecord.actions_taken || "",
        parts_used: editingRecord.parts_used || "",
        hours_spent: editingRecord.hours_spent?.toString() || "",
        cost: editingRecord.cost?.toString() || "",
        next_maintenance: editingRecord.next_maintenance || "",
      });
      
      if (editingRecord.inventory_item_id) {
        const item = equipmentItems.find(i => i.id === editingRecord.inventory_item_id);
        setSelectedItem(item || null);
      }
    } else if (preselectedItem) {
      // Handle preselection from item details
      setSelectedItem(preselectedItem);
      setFormData({
        ...initialFormData,
        inventory_item_id: preselectedItem.id,
        equipment_name: preselectedItem.item_name,
        equipment_code: preselectedItem.code || "",
      });
    } else {
      setFormData(initialFormData);
      setSelectedItem(null);
    }
  }, [editingRecord, equipmentItems, open, preselectedItem]);

  const handleSelectEquipment = (itemId: string) => {
    const item = equipmentItems.find((i) => i.id === itemId);
    if (item) {
      setSelectedItem(item);
      setFormData({
        ...formData,
        inventory_item_id: itemId,
        equipment_name: item.item_name,
        equipment_code: item.code || "",
      });
    }
  };

  const suggestNextMaintenance = () => {
    if (selectedItem?.calibration_interval_months) {
      const suggestedDate = addMonths(new Date(), selectedItem.calibration_interval_months);
      setFormData({
        ...formData,
        next_maintenance: format(suggestedDate, "yyyy-MM-dd"),
      });
    } else {
      // Default to 6 months
      const suggestedDate = addMonths(new Date(), 6);
      setFormData({
        ...formData,
        next_maintenance: format(suggestedDate, "yyyy-MM-dd"),
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

    onOpenChange(false);
    onSuccess();
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedItem(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {editingRecord ? "Editar Manutenção" : "Nova Manutenção"}
          </DialogTitle>
          <DialogDescription>
            {editingRecord 
              ? "Atualize os dados da manutenção" 
              : "Selecione um equipamento para ver suas informações e registrar uma nova manutenção"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Equipment Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">1</span>
              Equipamento
            </div>
            
            <div className="space-y-2">
              <Label>Selecionar Equipamento *</Label>
              <Select value={formData.inventory_item_id} onValueChange={handleSelectEquipment}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um equipamento cadastrado" />
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

            {selectedItem && (
              <div className="grid gap-4 md:grid-cols-2">
                <EquipmentInfoCard item={selectedItem} />
                <MaintenanceHistoryCard inventoryItemId={selectedItem.id} />
              </div>
            )}

            {!selectedItem && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Equipamento *</Label>
                  <Input
                    value={formData.equipment_name}
                    onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                    placeholder="Nome do equipamento"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={formData.equipment_code}
                    onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                    placeholder="Código do equipamento"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Section 2: Maintenance Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
              <FileText className="h-4 w-4" />
              Detalhes da Manutenção
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

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva a manutenção a ser realizada..."
                required
              />
            </div>
          </div>

          <Separator />

          {/* Section 3: Execution */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">3</span>
              <Calendar className="h-4 w-4" />
              Execução
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Técnico Responsável *</Label>
                <TechnicianSelect
                  value={formData.technician}
                  onChange={(v) => setFormData({ ...formData, technician: v })}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Programada *</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  required
                />
              </div>
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
                <Label className="flex items-center gap-2">
                  Próxima Manutenção
                  {(formData.status === "concluida" || selectedItem) && (
                    <Button 
                      type="button" 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs"
                      onClick={suggestNextMaintenance}
                    >
                      Sugerir data
                    </Button>
                  )}
                </Label>
                <Input
                  type="date"
                  value={formData.next_maintenance}
                  onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 4: Registration (optional) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs">4</span>
              <DollarSign className="h-4 w-4" />
              Registro (opcional)
            </div>

            <div className="space-y-2">
              <Label>Ações Realizadas</Label>
              <Textarea
                value={formData.actions_taken}
                onChange={(e) => setFormData({ ...formData, actions_taken: e.target.value })}
                placeholder="Descreva as ações realizadas..."
              />
            </div>

            <div className="space-y-2">
              <Label>Peças Utilizadas</Label>
              <Textarea
                value={formData.parts_used}
                onChange={(e) => setFormData({ ...formData, parts_used: e.target.value })}
                placeholder="Liste as peças utilizadas..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horas Gastas</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.hours_spent}
                  onChange={(e) => setFormData({ ...formData, hours_spent: e.target.value })}
                  placeholder="0.0"
                />
              </div>

              <div className="space-y-2">
                <Label>Custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              {editingRecord ? "Salvar" : "Criar Manutenção"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
