import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Wrench, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import type { InventorySituationFilter, InventoryStats } from "@/hooks/useUnifiedInventory";
import { cn } from "@/lib/utils";

interface InventoryDashboardProps {
  stats: InventoryStats;
  activeFilter: InventorySituationFilter;
  onFilterSelect: (filter: InventorySituationFilter) => void;
}

export default function InventoryDashboard({ stats, activeFilter, onFilterSelect }: InventoryDashboardProps) {
  const { t } = useTranslation();

  const statCards: Array<{
    title: string;
    value: number;
    icon: typeof Package;
    description: string;
    className: string;
    iconClass?: string;
    filter: InventorySituationFilter;
  }> = [
    {
      title: t("inventory.dashboard.totalItems"),
      value: stats.total,
      icon: Package,
      description: t("inventory.dashboard.consumablesAndEquipment", {
        consumables: stats.consumiveis,
        equipment: stats.equipamentos,
      }),
      className: "bg-card",
      filter: "all",
    },
    {
      title: t("inventory.dashboard.availableEquipment"),
      value: stats.available,
      icon: CheckCircle,
      description: t("inventory.dashboard.inService", { count: stats.inService }),
      className: "bg-green-500/10 border-green-500/20",
      iconClass: "text-green-600",
      filter: "available",
    },
    {
      title: t("inventory.dashboard.inMaintenance"),
      value: stats.maintenance,
      icon: Wrench,
      description: t("inventory.dashboard.equipmentInMaintenance"),
      className: "bg-orange-500/10 border-orange-500/20",
      iconClass: "text-orange-600",
      filter: "maintenance",
    },
    {
      title: t("inventory.dashboard.lowStock"),
      value: stats.lowStock,
      icon: AlertTriangle,
      description: t("inventory.dashboard.itemsBelowMinimum"),
      className: stats.lowStock > 0 ? "bg-destructive/10 border-destructive/20" : "bg-card",
      iconClass: stats.lowStock > 0 ? "text-destructive" : "text-muted-foreground",
      filter: "low_stock",
    },
    {
      title: t("inventory.dashboard.calibrationDue"),
      value: stats.calibrationDue,
      icon: Calendar,
      description: t("inventory.dashboard.next30Days"),
      className: stats.calibrationDue > 0 ? "bg-purple-500/10 border-purple-500/20" : "bg-card",
      iconClass: stats.calibrationDue > 0 ? "text-purple-600" : "text-muted-foreground",
      filter: "calibration_due",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {statCards.map((stat) => (
        <button key={stat.title} type="button" className="text-left" onClick={() => onFilterSelect(stat.filter)}>
          <Card className={cn(
            "h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
            stat.className,
            activeFilter === stat.filter && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.iconClass || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
