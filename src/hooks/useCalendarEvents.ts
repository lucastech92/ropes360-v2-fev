import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";

export type CalendarEventType = "service" | "maintenance" | "calibration" | "timesheet";

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  type: CalendarEventType;
  description?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export const useCalendarEvents = (currentDate: Date) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  return useQuery({
    queryKey: ["calendar-events", format(currentDate, "yyyy-MM")],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const events: CalendarEvent[] = [];

      // Fetch services
      const { data: services } = await supabase
        .from("services")
        .select("id, codigo_jbr, cliente, local, data_inicio, data_termino")
        .or(`data_inicio.gte.${format(monthStart, "yyyy-MM-dd")},data_termino.gte.${format(monthStart, "yyyy-MM-dd")}`)
        .or(`data_inicio.lte.${format(monthEnd, "yyyy-MM-dd")},data_termino.lte.${format(monthEnd, "yyyy-MM-dd")}`);

      services?.forEach((service) => {
        if (service.data_inicio) {
          events.push({
            id: `service-start-${service.id}`,
            title: `${service.codigo_jbr} - ${service.cliente}`,
            date: parseISO(service.data_inicio),
            endDate: service.data_termino ? parseISO(service.data_termino) : undefined,
            type: "service",
            description: service.local || undefined,
            status: "active",
            metadata: { serviceId: service.id, isStart: true },
          });
        }
        if (service.data_termino && service.data_termino !== service.data_inicio) {
          events.push({
            id: `service-end-${service.id}`,
            title: `Término: ${service.codigo_jbr}`,
            date: parseISO(service.data_termino),
            type: "service",
            description: `${service.cliente} - ${service.local || ""}`,
            status: "ending",
            metadata: { serviceId: service.id, isEnd: true },
          });
        }
      });

      // Fetch maintenance records
      const { data: maintenances } = await supabase
        .from("maintenance_records")
        .select("id, equipment_name, equipment_code, maintenance_type, scheduled_date, status, priority")
        .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(monthEnd, "yyyy-MM-dd"));

      maintenances?.forEach((maintenance) => {
        events.push({
          id: `maintenance-${maintenance.id}`,
          title: `Manutenção: ${maintenance.equipment_name}`,
          date: parseISO(maintenance.scheduled_date),
          type: "maintenance",
          description: `${maintenance.maintenance_type} - ${maintenance.equipment_code}`,
          status: maintenance.status,
          metadata: { 
            maintenanceId: maintenance.id, 
            priority: maintenance.priority,
            maintenanceType: maintenance.maintenance_type 
          },
        });
      });

      // Fetch equipment calibrations
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id, name, code, next_calibration, status")
        .gte("next_calibration", format(monthStart, "yyyy-MM-dd"))
        .lte("next_calibration", format(monthEnd, "yyyy-MM-dd"));

      equipment?.forEach((equip) => {
        if (equip.next_calibration) {
          events.push({
            id: `calibration-${equip.id}`,
            title: `Calibração: ${equip.name}`,
            date: parseISO(equip.next_calibration),
            type: "calibration",
            description: `Código: ${equip.code}`,
            status: equip.status || undefined,
            metadata: { equipmentId: equip.id },
          });
        }
      });

      // Fetch inventory calibrations
      const { data: inventory } = await supabase
        .from("inventory")
        .select("id, item_name, code, next_calibration, status")
        .eq("item_type", "equipamento")
        .gte("next_calibration", format(monthStart, "yyyy-MM-dd"))
        .lte("next_calibration", format(monthEnd, "yyyy-MM-dd"));

      inventory?.forEach((item) => {
        if (item.next_calibration) {
          events.push({
            id: `inv-calibration-${item.id}`,
            title: `Calibração: ${item.item_name}`,
            date: parseISO(item.next_calibration),
            type: "calibration",
            description: item.code ? `Código: ${item.code}` : undefined,
            status: item.status || undefined,
            metadata: { inventoryId: item.id },
          });
        }
      });

      // Fetch time entries
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("id, entry_date, check_in_type, notes, user_id")
        .eq("user_id", user.id)
        .gte("entry_date", format(monthStart, "yyyy-MM-dd"))
        .lte("entry_date", format(monthEnd, "yyyy-MM-dd"));

      const checkInTypeLabels: Record<string, string> = {
        home_office: "Home Office",
        offshore: "Offshore",
        travel: "Viagem",
        base: "Base",
        day_off: "Folga",
        vacation: "Férias",
      };

      timeEntries?.forEach((entry) => {
        events.push({
          id: `timesheet-${entry.id}`,
          title: checkInTypeLabels[entry.check_in_type] || entry.check_in_type,
          date: parseISO(entry.entry_date),
          type: "timesheet",
          description: entry.notes || undefined,
          status: entry.check_in_type,
          metadata: { entryId: entry.id, checkInType: entry.check_in_type },
        });
      });

      return events;
    },
  });
};

