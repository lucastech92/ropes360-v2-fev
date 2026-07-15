import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Service {
  id: string;
  codigo_jbr: string;
  cliente: string;
  local: string | null;
}

interface ServiceLinkSelectProps {
  selectedServiceId: string | null;
  onChange: (serviceId: string | null) => void;
  onServiceSelected?: (service: Service | null) => void;
}

export const ServiceLinkSelect = ({
  selectedServiceId,
  onChange,
  onServiceSelected,
}: ServiceLinkSelectProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, codigo_jbr, cliente, local")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setServices(data);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    const id = value === "none" ? null : value;
    onChange(id);
    if (onServiceSelected) {
      const service = id ? services.find(s => s.id === id) || null : null;
      onServiceSelected(service);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          JBR (opcional)
        </Label>
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Briefcase className="h-4 w-4" />
        JBR (opcional)
      </Label>
      <Select 
        value={selectedServiceId || "none"} 
        onValueChange={handleChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um serviço" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Nenhum JBR</span>
          </SelectItem>
          {services.map((service) => (
            <SelectItem key={service.id} value={service.id}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {service.codigo_jbr}
                </Badge>
                <span className="truncate">{service.cliente}</span>
                {service.local && (
                  <span className="text-muted-foreground text-xs">• {service.local}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedServiceId && (
        <p className="text-xs text-muted-foreground">
          O código será preenchido e o checklist vinculado automaticamente.
        </p>
      )}
    </div>
  );
};
