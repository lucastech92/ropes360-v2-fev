import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TimelineEvent {
  event_type: string;
  event_date: string;
  title: string;
  description: string;
  icon_type: string;
  actor_name: string;
  metadata: Record<string, unknown> | null;
}

export interface ServiceInfo {
  id: string;
  codigo_jbr: string;
  cliente: string;
  local: string | null;
  escopo: string[] | null;
  data_inicio: string | null;
  data_termino: string | null;
  operational_status: string;
  operational_status_updated_at: string;
  responsible_user_id: string | null;
  responsible_name: string | null;
  logistics_container_id: string | null;
  logistics_released_at: string | null;
}

export const useServiceTimeline = (serviceId: string | undefined) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!serviceId) return;

    const fetchData = async () => {
      setLoading(true);
      
      const [timelineRes, serviceRes] = await Promise.all([
        supabase.rpc("get_service_timeline", { p_service_id: serviceId }),
        supabase.from("services").select("id, codigo_jbr, cliente, local, escopo, data_inicio, data_termino, operational_status, operational_status_updated_at, responsible_user_id, logistics_container_id, logistics_released_at").eq("id", serviceId).single(),
      ]);

      if (timelineRes.data) {
        setEvents(timelineRes.data as TimelineEvent[]);
      }
      if (serviceRes.data) {
        let responsible_name: string | null = null;
        if (serviceRes.data.responsible_user_id) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("full_name")
            .eq("user_id", serviceRes.data.responsible_user_id)
            .maybeSingle();
          responsible_name = profile?.full_name ?? null;
        }
        setServiceInfo({ ...serviceRes.data, responsible_name });
      }
      
      setLoading(false);
    };

    fetchData();
  }, [serviceId, refreshKey]);

  const filteredEvents = filter === "all"
    ? events
    : events.filter(e => e.event_type.startsWith(filter));

  const eventCategories = [
    { key: "all", label: "Todos" },
    { key: "service", label: "Serviço" },
    { key: "collaborator", label: "Equipe" },
    { key: "checklist", label: "Checklists" },
    { key: "equipment", label: "Equipamentos" },
    { key: "inventory", label: "Inventário" },
    { key: "activity", label: "Atividades" },
  ];

  const refresh = () => setRefreshKey((current) => current + 1);

  return { events: filteredEvents, allEvents: events, serviceInfo, loading, filter, setFilter, eventCategories, refresh };
};
