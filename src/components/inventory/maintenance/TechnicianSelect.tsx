import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";

interface Technician {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface TechnicianSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TechnicianSelect({ value, onChange }: TechnicianSelectProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [useManualInput, setUseManualInput] = useState(false);

  useEffect(() => {
    const fetchTechnicians = async () => {
      setLoading(true);
      
      // Fetch approved users from user_profiles joined with user_roles
      const { data: profiles, error } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, email")
        .order("full_name");

      if (!error && profiles) {
        // Filter to only approved users
        const { data: approvedRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("approved", true);

        const approvedUserIds = new Set(approvedRoles?.map(r => r.user_id) || []);
        const approvedTechnicians = profiles.filter(p => approvedUserIds.has(p.user_id));
        
        setTechnicians(approvedTechnicians);
      }
      setLoading(false);
    };

    fetchTechnicians();
  }, []);

  // Check if current value matches any technician
  const matchesTechnician = technicians.some(
    t => t.full_name === value || t.email === value
  );

  // If value exists but doesn't match any technician, use manual input
  useEffect(() => {
    if (value && !matchesTechnician && technicians.length > 0 && !loading) {
      setUseManualInput(true);
    }
  }, [value, matchesTechnician, technicians.length, loading]);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Carregando..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (technicians.length === 0 || useManualInput) {
    return (
      <div className="space-y-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nome do técnico"
        />
        {technicians.length > 0 && (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => setUseManualInput(false)}
          >
            Selecionar da lista
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um técnico" />
        </SelectTrigger>
        <SelectContent>
          {technicians.map((tech) => (
            <SelectItem key={tech.user_id} value={tech.full_name || tech.email || tech.user_id}>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{tech.full_name || tech.email || "Usuário sem nome"}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-primary hover:underline"
        onClick={() => setUseManualInput(true)}
      >
        Digitar manualmente
      </button>
    </div>
  );
}

