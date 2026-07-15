import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "recharts";
import { Package, Wrench, Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import type { UnifiedInventoryItem } from "@/hooks/useUnifiedInventory";

interface UtilizationTabProps {
  items: UnifiedInventoryItem[];
}

interface AllocationRecord {
  id: string;
  inventory_item_id: string;
  checkout_date: string;
  checkin_date: string | null;
}

export default function UtilizationTab({ items }: UtilizationTabProps) {
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const equipmentItems = items.filter((i) => i.item_type === "equipamento");

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("inventory_allocations")
      .select("id, inventory_item_id, checkout_date, checkin_date")
      .gte("checkout_date", thirtyDaysAgo.toISOString());

    if (!error && data) {
      setAllocations(data as AllocationRecord[]);
    }
    setLoading(false);
  };

  // Calculate utilization rate for each equipment
  const utilizationData = equipmentItems.map((item) => {
    const itemAllocations = allocations.filter((a) => a.inventory_item_id === item.id);
    let totalHoursUsed = 0;

    itemAllocations.forEach((allocation) => {
      const checkout = new Date(allocation.checkout_date);
      const checkin = allocation.checkin_date ? new Date(allocation.checkin_date) : new Date();
      const hoursUsed = (checkin.getTime() - checkout.getTime()) / (1000 * 60 * 60);
      totalHoursUsed += hoursUsed;
    });

    const totalHoursAvailable = 30 * 24; // 30 days
    const utilizationRate = Math.min((totalHoursUsed / totalHoursAvailable) * 100, 100);

    return {
      name: item.item_name.length > 15 ? item.item_name.substring(0, 15) + "..." : item.item_name,
      fullName: item.item_name,
      utilizationRate: Math.round(utilizationRate),
      hoursUsed: Math.round(totalHoursUsed),
      allocations: itemAllocations.length,
      status: item.status,
    };
  });

  // Status distribution
  const statusDistribution = [
    { name: "Disponível", value: equipmentItems.filter((i) => i.status === "available").length, color: "#22c55e" },
    { name: "Em Serviço", value: equipmentItems.filter((i) => i.status === "in_service").length, color: "#3b82f6" },
    { name: "Manutenção", value: equipmentItems.filter((i) => i.status === "maintenance").length, color: "#f97316" },
    { name: "Calibração", value: equipmentItems.filter((i) => i.status === "calibration").length, color: "#a855f7" },
    { name: "Inativo", value: equipmentItems.filter((i) => i.status === "inactive").length, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  // Condition distribution
  const conditionDistribution = [
    { name: "Excelente", value: equipmentItems.filter((i) => i.condition === "excellent").length, color: "#22c55e" },
    { name: "Bom", value: equipmentItems.filter((i) => i.condition === "good").length, color: "#3b82f6" },
    { name: "Regular", value: equipmentItems.filter((i) => i.condition === "fair").length, color: "#eab308" },
    { name: "Precisa Reparo", value: equipmentItems.filter((i) => i.condition === "needs_repair").length, color: "#f97316" },
    { name: "Danificado", value: equipmentItems.filter((i) => i.condition === "damaged").length, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  // Top utilized equipment
  const topUtilized = [...utilizationData]
    .sort((a, b) => b.utilizationRate - a.utilizationRate)
    .slice(0, 5);

  // Idle equipment (available but 0% utilization)
  const idleEquipment = utilizationData.filter(
    (item) => item.utilizationRate === 0 && item.status === "available"
  );

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando dados de utilização...
      </div>
    );
  }

  if (equipmentItems.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum equipamento cadastrado para análise</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipmentItems.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {equipmentItems.filter((i) => i.status === "available").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-600" />
              Em Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {equipmentItems.filter((i) => i.status === "in_service").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Ociosos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{idleEquipment.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Status</CardTitle>
            <CardDescription>Status atual dos equipamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Condition Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Condição</CardTitle>
            <CardDescription>Estado de conservação dos equipamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conditionDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {conditionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Taxa de Utilização (últimos 30 dias)
          </CardTitle>
          <CardDescription>Percentual de tempo em que cada equipamento esteve alocado</CardDescription>
        </CardHeader>
        <CardContent>
          {utilizationData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Sem dados de alocação no período
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizationData.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, "Utilização"]}
                    labelFormatter={(label) => utilizationData.find((d) => d.name === label)?.fullName || label}
                  />
                  <Bar dataKey="utilizationRate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lists Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Utilized */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mais Utilizados</CardTitle>
            <CardDescription>Equipamentos com maior taxa de utilização</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topUtilized.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem dados de utilização</p>
              ) : (
                topUtilized.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.fullName}</p>
                      <p className="text-xs text-muted-foreground">{item.allocations} alocações</p>
                    </div>
                    <Badge variant="secondary">{item.utilizationRate}%</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Idle Equipment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Equipamentos Ociosos</CardTitle>
            <CardDescription>Disponíveis sem uso nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {idleEquipment.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum equipamento ocioso</p>
              ) : (
                idleEquipment.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <p className="font-medium text-sm">{item.fullName}</p>
                    <Badge variant="outline" className="text-orange-600">
                      <Clock className="h-3 w-3 mr-1" />
                      Ocioso
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

