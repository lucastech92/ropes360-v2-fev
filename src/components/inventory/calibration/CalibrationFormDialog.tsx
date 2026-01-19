import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedInventoryItem } from "@/hooks/useUnifiedInventory";
import EquipmentInfoCard from "../maintenance/EquipmentInfoCard";
import { CalibrationHistoryCard } from "./CalibrationHistoryCard";
import TechnicianSelect from "../maintenance/TechnicianSelect";
import { format, addMonths } from "date-fns";
import { Gauge, Wand2, Save, Loader2, Package } from "lucide-react";

interface CalibrationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: UnifiedInventoryItem[];
  onSuccess: () => void;
  preselectedItem?: UnifiedInventoryItem | null;
}

interface CalibrationFormData {
  inventory_item_id: string;
  calibration_date: string;
  next_calibration: string;
  certificate_number: string;
  responsible: string;
  observations: string;
}

const initialFormData: CalibrationFormData = {
  inventory_item_id: "",
  calibration_date: format(new Date(), "yyyy-MM-dd"),
  next_calibration: "",
  certificate_number: "",
  responsible: "",
  observations: "",
};

export function CalibrationFormDialog({
  open,
  onOpenChange,
  items,
  onSuccess,
  preselectedItem,
}: CalibrationFormDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CalibrationFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Filter only equipment items
  const equipmentItems = useMemo(() => {
    return items.filter((item) => item.item_type === "equipamento");
  }, [items]);

  // Selected item
  const selectedItem = useMemo(() => {
    return equipmentItems.find((item) => item.id === formData.inventory_item_id);
  }, [equipmentItems, formData.inventory_item_id]);

  // Initialize form with preselected item
  useEffect(() => {
    if (open) {
      if (preselectedItem) {
        setFormData({
          ...initialFormData,
          inventory_item_id: preselectedItem.id,
          calibration_date: format(new Date(), "yyyy-MM-dd"),
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [open, preselectedItem]);

  // Auto-suggest next calibration when item is selected
  useEffect(() => {
    if (selectedItem && formData.calibration_date && !formData.next_calibration) {
      suggestNextCalibration();
    }
  }, [selectedItem, formData.calibration_date]);

  const suggestNextCalibration = () => {
    if (!formData.calibration_date) return;

    const calibrationDate = new Date(formData.calibration_date);
    const intervalMonths = selectedItem?.calibration_interval_months || 12;
    const suggestedDate = addMonths(calibrationDate, intervalMonths);

    setFormData((prev) => ({
      ...prev,
      next_calibration: format(suggestedDate, "yyyy-MM-dd"),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.inventory_item_id || !formData.calibration_date || !formData.next_calibration) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o equipamento, data de calibração e próxima calibração.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Update inventory with calibration dates
      const { error } = await supabase
        .from("inventory")
        .update({
          last_calibration: formData.calibration_date,
          next_calibration: formData.next_calibration,
          last_updated: new Date().toISOString(),
        })
        .eq("id", formData.inventory_item_id);

      if (error) throw error;

      toast({
        title: "Calibração registrada",
        description: "A calibração foi registrada com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao registrar calibração:", error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível registrar a calibração.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Nova Calibração
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Equipment Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Equipamento</h3>
            </div>

            <Select
              value={formData.inventory_item_id}
              onValueChange={(value) =>
                setFormData({ ...formData, inventory_item_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o equipamento..." />
              </SelectTrigger>
              <SelectContent>
                {equipmentItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center gap-2">
                      <span>{item.item_name}</span>
                      {item.code && (
                        <Badge variant="outline" className="text-xs">
                          {item.code}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedItem && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EquipmentInfoCard item={selectedItem} />
                <CalibrationHistoryCard
                  lastCalibration={selectedItem.last_calibration}
                  nextCalibration={selectedItem.next_calibration}
                  calibrationInterval={selectedItem.calibration_interval_months}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Calibration Data Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Dados da Calibração</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calibration_date">Data de Realização *</Label>
                <Input
                  id="calibration_date"
                  type="date"
                  value={formData.calibration_date}
                  onChange={(e) =>
                    setFormData({ ...formData, calibration_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="next_calibration">Próxima Calibração *</Label>
                <div className="flex gap-2">
                  <Input
                    id="next_calibration"
                    type="date"
                    value={formData.next_calibration}
                    onChange={(e) =>
                      setFormData({ ...formData, next_calibration: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={suggestNextCalibration}
                    title="Sugerir data baseada no intervalo"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
                {selectedItem?.calibration_interval_months && (
                  <p className="text-xs text-muted-foreground">
                    Intervalo configurado: {selectedItem.calibration_interval_months} meses
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificate_number">Nº Certificado</Label>
                <Input
                  id="certificate_number"
                  placeholder="Ex: CERT-2026-001"
                  value={formData.certificate_number}
                  onChange={(e) =>
                    setFormData({ ...formData, certificate_number: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible">Responsável</Label>
                <TechnicianSelect
                  value={formData.responsible}
                  onChange={(value) =>
                    setFormData({ ...formData, responsible: value })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Observações sobre a calibração..."
                  value={formData.observations}
                  onChange={(e) =>
                    setFormData({ ...formData, observations: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Registrar Calibração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
