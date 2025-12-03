import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Equipment, EquipmentCondition } from "@/hooks/useEquipment";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";

const formSchema = z.object({
  service_id: z.string().optional(),
  destination: z.string().min(1, "Destino é obrigatório"),
  condition: z.enum(["excellent", "good", "fair", "needs_repair", "damaged"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EquipmentCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  onCheckout: (
    equipmentId: string,
    serviceId: string | null,
    condition: EquipmentCondition,
    destination: string,
    notes?: string
  ) => void;
}

interface Service {
  id: string;
  codigo_jbr: string;
  cliente: string;
}

const EquipmentCheckout = ({
  open,
  onOpenChange,
  equipment,
  onCheckout,
}: EquipmentCheckoutProps) => {
  const [services, setServices] = useState<Service[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service_id: "",
      destination: "",
      condition: equipment?.condition || "good",
      notes: "",
    },
  });

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from("services")
        .select("id, codigo_jbr, cliente")
        .order("created_at", { ascending: false })
        .limit(50);
      setServices((data || []) as Service[]);
    };

    if (open) {
      fetchServices();
      form.reset({
        service_id: "",
        destination: "",
        condition: equipment?.condition || "good",
        notes: "",
      });
    }
  }, [open, equipment]);

  const handleSubmit = (data: FormData) => {
    if (!equipment) return;
    onCheckout(
      equipment.id,
      data.service_id || null,
      data.condition,
      data.destination,
      data.notes
    );
    onOpenChange(false);
  };

  const selectedService = services.find((s) => s.id === form.watch("service_id"));

  useEffect(() => {
    if (selectedService) {
      form.setValue("destination", selectedService.cliente);
    }
  }, [selectedService]);

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-blue-500" />
            Check-out de Equipamento
          </DialogTitle>
          <DialogDescription>
            Registrar saída de <strong>{equipment.name}</strong> ({equipment.code})
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço (JBR)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um serviço (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.codigo_jbr} - {service.cliente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do cliente / Plataforma" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condição Atual</FormLabel>
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas sobre a saída..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                Confirmar Check-out
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentCheckout;
