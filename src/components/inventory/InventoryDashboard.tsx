import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Wrench, AlertTriangle, CheckCircle, Clock, Calendar } from "lucide-react";
import type { InventoryStats } from "@/hooks/useUnifiedInventory";

interface InventoryDashboardProps {
  stats: InventoryStats;
}

export default function InventoryDashboard({ stats }: InventoryDashboardProps) {
  const statCards = [
    {
      title: "Total de Itens",
      value: stats.total,
      icon: Package,
      description: `${stats.consumiveis} consumíveis, ${stats.equipamentos} equipamentos`,
      className: "bg-card",
    },
    {
      title: "Equipamentos Disponíveis",
      value: stats.available,
      icon: CheckCircle,
      description: `${stats.inService} em serviço`,
      className: "bg-green-500/10 border-green-500/20",
      iconClass: "text-green-600",
    },
    {
      title: "Em Manutenção",
      value: stats.maintenance,
      icon: Wrench,
      description: "Equipamentos em manutenção",
      className: "bg-orange-500/10 border-orange-500/20",
      iconClass: "text-orange-600",
    },
    {
      title: "Estoque Baixo",
      value: stats.lowStock,
      icon: AlertTriangle,
      description: "Itens abaixo do mínimo",
      className: stats.lowStock > 0 ? "bg-destructive/10 border-destructive/20" : "bg-card",
      iconClass: stats.lowStock > 0 ? "text-destructive" : "text-muted-foreground",
    },
    {
      title: "Calibração Próxima",
      value: stats.calibrationDue,
      icon: Calendar,
      description: "Nos próximos 30 dias",
      className: stats.calibrationDue > 0 ? "bg-purple-500/10 border-purple-500/20" : "bg-card",
      iconClass: stats.calibrationDue > 0 ? "text-purple-600" : "text-muted-foreground",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {statCards.map((stat) => (
        <Card key={stat.title} className={stat.className}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.iconClass || "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
