import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EquipmentCondition } from "@/hooks/useUnifiedInventory";

// Equipment type for checkin component
interface Equipment {
  id: string;
  code: string;
  name: string;
  category: string;
  status: string;
  condition: EquipmentCondition;
  current_location: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  acquisition_date: string | null;
  last_calibration: string | null;
  next_calibration: string | null;
  calibration_interval_months: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  current_service_id: string | null;
  inventory_item_id: string | null;
}
import { LogIn, AlertTriangle } from "lucide-react";

const formSchema = z.object({
  condition: z.enum(["excellent", "good", "fair", "needs_repair", "damaged"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EquipmentCheckinProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  onCheckin: (equipmentId: string, condition: EquipmentCondition, notes?: string) => void;
}

const EquipmentCheckin = ({
  open,
  onOpenChange,
  equipment,
  onCheckin,
}: EquipmentCheckinProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      condition: "good",
      notes: "",
    },
  });

  const selectedCondition = form.watch("condition");
  const needsMaintenance = selectedCondition === "needs_repair" || selectedCondition === "damaged";

  const handleSubmit = (data: FormData) => {
    if (!equipment) return;
    onCheckin(equipment.id, data.condition, data.notes);
    onOpenChange(false);
    form.reset();
  };

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-emerald-500" />
            Check-in de Equipamento
          </DialogTitle>
          <DialogDescription>
            Registrar retorno de <strong>{equipment.name}</strong> ({equipment.code})
            <br />
            <span className="text-muted-foreground">
              Localização atual: {equipment.current_location}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condição de Retorno *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="excellent">Excelente</SelectItem>
                      <SelectItem value="good">Bom</SelectItem>
                      <SelectItem value="fair">Regular</SelectItem>
                      <SelectItem value="needs_repair">Precisa Reparo</SelectItem>
                      <SelectItem value="damaged">Danificado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {needsMaintenance && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Equipamento com problemas detectados. Recomenda-se abrir uma ordem de manutenção
                  após o check-in.
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva problemas encontrados, desgastes observados..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant={needsMaintenance ? "destructive" : "default"}>
                <LogIn className="h-4 w-4 mr-2" />
                Confirmar Check-in
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentCheckin;
