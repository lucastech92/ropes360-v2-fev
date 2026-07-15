import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Container { id: string; name: string; code: string | null; status: string; assigned_service_id: string | null; }
interface Props { selectedServiceId: string | null; selectedContainerId: string | null; onChange: (id: string | null) => void; }

export const ContainerLinkSelect = ({ selectedServiceId, selectedContainerId, onChange }: Props) => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { supabase.from("operation_containers").select("id,name,code,status,assigned_service_id").order("name").then(({ data }) => { setContainers((data ?? []) as Container[]); setLoading(false); }); }, []);
  const available = containers.filter(container => container.status === "available" || container.assigned_service_id === selectedServiceId || container.id === selectedContainerId);
  return <div className="space-y-2"><Label>Container (opcional)</Label><Select value={selectedContainerId || "none"} onValueChange={value => onChange(value === "none" ? null : value)} disabled={!selectedServiceId || loading}><SelectTrigger><SelectValue placeholder={!selectedServiceId ? "Selecione primeiro o JBR" : loading ? "Carregando..." : "Selecione o container"} /></SelectTrigger><SelectContent><SelectItem value="none">Definir depois</SelectItem>{available.map(container => <SelectItem key={container.id} value={container.id}>{container.name}{container.code ? ` · ${container.code}` : ""}{container.assigned_service_id === selectedServiceId ? " · já reservado" : ""}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Containers reservados para outros JBRs não são exibidos.</p></div>;
};
