import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaintenanceTimelineProps {
  maintenanceRecords: any[];
}

export const MaintenanceTimeline = ({ maintenanceRecords }: MaintenanceTimelineProps) => {
  // Últimos 6 meses
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = startOfMonth(subMonths(new Date(), 5 - i));
    return {
      date,
      label: format(date, "MMM/yy", { locale: ptBR }),
    };
  });

  const data = months.map(({ date, label }) => {
    const monthStart = startOfMonth(date);
    const nextMonthStart = startOfMonth(subMonths(date, -1));

    const monthRecords = maintenanceRecords.filter((record) => {
      const recordDate = new Date(record.scheduled_date || record.created_at);
      return recordDate >= monthStart && recordDate < nextMonthStart;
    });

    const pending = monthRecords.filter((r) => r.status === "pendente").length;
    const inProgress = monthRecords.filter((r) => r.status === "em andamento").length;
    const completed = monthRecords.filter((r) => r.status === "concluído").length;

    return {
      month: label,
      Pendente: pending,
      "Em Andamento": inProgress,
      Concluído: completed,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "hsl(var(--card))", 
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)"
          }} 
        />
        <Legend />
        <Bar dataKey="Pendente" fill="hsl(48, 96%, 53%)" />
        <Bar dataKey="Em Andamento" fill="hsl(210, 100%, 56%)" />
        <Bar dataKey="Concluído" fill="hsl(142, 71%, 45%)" />
      </BarChart>
    </ResponsiveContainer>
  );
};
