import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Activity, TrendingUp, Clock, Loader2 } from "lucide-react";
import { format, subDays, startOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UtilizationData {
  equipment: { id: string; name: string; code: string; category: string }[];
  allocations: {
    equipment_id: string;
    checkout_date: string;
    checkin_date: string | null;
  }[];
}

interface EquipmentUsage {
  name: string;
  code: string;
  daysInService: number;
  utilizationRate: number;
}

interface CategoryUsage {
  category: string;
  count: number;
  totalDays: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const EquipmentUtilizationDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UtilizationData | null>(null);
  const [topEquipment, setTopEquipment] = useState<EquipmentUsage[]>([]);
  const [categoryUsage, setCategoryUsage] = useState<CategoryUsage[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; allocations: number }[]>([]);
  const [avgUtilization, setAvgUtilization] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [equipmentRes, allocationsRes] = await Promise.all([
        supabase.from("equipment").select("id, name, code, category"),
        supabase.from("equipment_allocations").select("equipment_id, checkout_date, checkin_date"),
      ]);

      if (equipmentRes.error) throw equipmentRes.error;
      if (allocationsRes.error) throw allocationsRes.error;

      const fetchedData: UtilizationData = {
        equipment: equipmentRes.data || [],
        allocations: allocationsRes.data || [],
      };

      setData(fetchedData);
      processData(fetchedData);
    } catch (error) {
      console.error("Error fetching utilization data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processData = (data: UtilizationData) => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    // Calculate days in service per equipment (last 30 days)
    const equipmentUsage: Map<string, number> = new Map();

    data.allocations.forEach((allocation) => {
      const checkoutDate = new Date(allocation.checkout_date);
      const checkinDate = allocation.checkin_date ? new Date(allocation.checkin_date) : now;

      // Only count days within the last 30 days
      const startDate = checkoutDate > thirtyDaysAgo ? checkoutDate : thirtyDaysAgo;
      const endDate = checkinDate < now ? checkinDate : now;

      if (startDate < endDate) {
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const current = equipmentUsage.get(allocation.equipment_id) || 0;
        equipmentUsage.set(allocation.equipment_id, current + days);
      }
    });

    // Top equipment by usage
    const topEq: EquipmentUsage[] = data.equipment
      .map((eq) => {
        const daysInService = equipmentUsage.get(eq.id) || 0;
        return {
          name: eq.name.length > 20 ? eq.name.substring(0, 20) + "..." : eq.name,
          code: eq.code,
          daysInService,
          utilizationRate: Math.min(100, Math.round((daysInService / 30) * 100)),
        };
      })
      .sort((a, b) => b.daysInService - a.daysInService)
      .slice(0, 8);

    setTopEquipment(topEq);

    // Average utilization
    const totalUtilization = topEq.reduce((sum, eq) => sum + eq.utilizationRate, 0);
    setAvgUtilization(data.equipment.length > 0 ? Math.round(totalUtilization / data.equipment.length) : 0);

    // Category usage
    const categoryMap: Map<string, CategoryUsage> = new Map();
    data.equipment.forEach((eq) => {
      const days = equipmentUsage.get(eq.id) || 0;
      const existing = categoryMap.get(eq.category);
      if (existing) {
        existing.count++;
        existing.totalDays += days;
      } else {
        categoryMap.set(eq.category, { category: eq.category, count: 1, totalDays: days });
      }
    });
    setCategoryUsage(Array.from(categoryMap.values()));

    // Monthly trend (last 6 months)
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: startOfMonth(now) });

    const trend = months.map((monthStart) => {
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const allocationsInMonth = data.allocations.filter((a) => {
        const checkout = new Date(a.checkout_date);
        return checkout >= monthStart && checkout <= monthEnd;
      }).length;

      return {
        month: format(monthStart, "MMM", { locale: ptBR }),
        allocations: allocationsInMonth,
      };
    });

    setMonthlyTrend(trend);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.allocations.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total de Alocações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgUtilization}%</p>
                <p className="text-xs text-muted-foreground">Utilização Média (30 dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {topEquipment.length > 0 ? topEquipment[0].daysInService : 0}
                </p>
                <p className="text-xs text-muted-foreground">Dias do Mais Usado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Equipment Usage */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Equipamentos Mais Utilizados</CardTitle>
          </CardHeader>
          <CardContent>
            {topEquipment.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topEquipment} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="code"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`${value} dias`, "Em Serviço"]}
                  />
                  <Bar dataKey="daysInService" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado de utilização disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Utilization Rate */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Taxa de Utilização (%)</CardTitle>
          </CardHeader>
          <CardContent>
            {topEquipment.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topEquipment} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    type="category"
                    dataKey="code"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`${value}%`, "Utilização"]}
                  />
                  <Bar
                    dataKey="utilizationRate"
                    fill="hsl(var(--chart-2))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado de utilização disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Uso por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryUsage}
                    dataKey="totalDays"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ category, percent }) =>
                      `${category}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {categoryUsage.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} dias`,
                      name,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado de categoria disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Tendência de Alocações</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend} margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [value, "Alocações"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="allocations"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado de tendência disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EquipmentUtilizationDashboard;
