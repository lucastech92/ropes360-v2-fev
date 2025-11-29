import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServicesEvolutionChartProps {
  services: any[];
}

export const ServicesEvolutionChart = ({ services }: ServicesEvolutionChartProps) => {
  // Generate last 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = startOfMonth(subMonths(new Date(), 5 - i));
    return {
      date,
      label: format(date, "MMM/yy", { locale: ptBR }),
      month: date.getMonth(),
      year: date.getFullYear(),
    };
  });

  // Count services per month
  const data = months.map(({ label, month, year }) => {
    const count = services.filter((service) => {
      if (!service.data_inicio) return false;
      const start = new Date(service.data_inicio);
      return start.getMonth() === month && start.getFullYear() === year;
    }).length;

    return {
      month: label,
      servicos: count,
    };
  });

  if (data.every(d => d.servicos === 0)) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Nenhum serviço registrado nos últimos 6 meses
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="month" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="servicos" 
          stroke="hsl(var(--accent))" 
          strokeWidth={2}
          dot={{ fill: "hsl(var(--accent))" }}
          name="Serviços"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
