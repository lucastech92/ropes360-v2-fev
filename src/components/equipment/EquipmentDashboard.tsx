import { Package, CheckCircle, Truck, Wrench, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EquipmentStats } from "@/hooks/useEquipment";

interface EquipmentDashboardProps {
  stats: EquipmentStats;
}

const EquipmentDashboard = ({ stats }: EquipmentDashboardProps) => {
  const cards = [
    {
      title: "Total",
      value: stats.total,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Disponíveis",
      value: stats.available,
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Em Serviço",
      value: stats.inService,
      icon: Truck,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Manutenção",
      value: stats.maintenance,
      icon: Wrench,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Calibração Pendente",
      value: stats.calibrationDue,
      icon: AlertTriangle,
      color: stats.calibrationDue > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: stats.calibrationDue > 0 ? "bg-destructive/10" : "bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", card.bgColor)}>
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EquipmentDashboard;
