import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface InventoryTrendsChartProps {
  inventory: any[];
}

export const InventoryTrendsChart = ({ inventory }: InventoryTrendsChartProps) => {
  // Group items by category
  const categoryStats: Record<string, { total: number; lowStock: number }> = {};
  
  inventory.forEach((item) => {
    const category = item.category || "Sem categoria";
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, lowStock: 0 };
    }
    categoryStats[category].total += 1;
    if (item.min_quantity && item.quantity < item.min_quantity) {
      categoryStats[category].lowStock += 1;
    }
  });

  const data = Object.entries(categoryStats).map(([name, stats]) => ({
    categoria: name,
    total: stats.total,
    "Estoque Baixo": stats.lowStock,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Nenhum dado de inventário disponível
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="categoria" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          angle={-45}
          textAnchor="end"
          height={80}
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
        <Bar dataKey="total" fill="hsl(var(--primary))" name="Total de Itens" />
        <Bar dataKey="Estoque Baixo" fill="hsl(48, 96%, 53%)" />
      </BarChart>
    </ResponsiveContainer>
  );
};

