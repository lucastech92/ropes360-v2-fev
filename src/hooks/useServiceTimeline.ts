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
}

export const useServiceTimeline = (serviceId: string | undefined) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!serviceId) return;

    const fetchData = async () => {
      setLoading(true);
      
      const [timelineRes, serviceRes] = await Promise.all([
        supabase.rpc("get_service_timeline", { p_service_id: serviceId }),
        supabase.from("services").select("id, codigo_jbr, cliente, local, escopo, data_inicio, data_termino").eq("id", serviceId).single(),
      ]);

      if (timelineRes.data) {
        setEvents(timelineRes.data as TimelineEvent[]);
      }
      if (serviceRes.data) {
        setServiceInfo(serviceRes.data);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [serviceId]);

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

  return { events: filteredEvents, allEvents: events, serviceInfo, loading, filter, setFilter, eventCategories };
};
