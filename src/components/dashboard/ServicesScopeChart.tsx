import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ServicesScopeChartProps {
  services: any[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 100%, 56%)",
  "hsl(142, 71%, 45%)",
  "hsl(48, 96%, 53%)",
  "hsl(280, 80%, 55%)",
];

export const ServicesScopeChart = ({ services }: ServicesScopeChartProps) => {
  // Contar tipos de escopo
  const scopeCount: Record<string, number> = {};
  
  services.forEach((service) => {
    if (service.escopo && Array.isArray(service.escopo)) {
      service.escopo.forEach((scope: string) => {
        scopeCount[scope] = (scopeCount[scope] || 0) + 1;
      });
    }
  });

  const data = Object.entries(scopeCount).map(([name, value]) => ({
    name,
    value,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Nenhum dado de escopo disponível
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="hsl(var(--primary))"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

