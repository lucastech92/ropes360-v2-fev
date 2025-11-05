import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileText, Package, Settings, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export const DashboardMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Documents count
      const { count: docsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true });

      // Expiring documents
      const { count: expiringCount } = await supabase
        .from("documents_expiring_soon")
        .select("*", { count: "exact", head: true });

      // Low inventory items
      const { data: lowInventory } = await supabase
        .from("inventory")
        .select("*")
        .filter("quantity", "lt", "min_quantity");

      // Pending maintenance
      const { count: pendingMaintenance } = await supabase
        .from("maintenance_records")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");

      // Recent activity count
      const { count: activityCount } = await supabase
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      return {
        totalDocuments: docsCount || 0,
        expiringDocuments: expiringCount || 0,
        lowInventoryItems: lowInventory?.length || 0,
        pendingMaintenance: pendingMaintenance || 0,
        weeklyActivity: activityCount || 0,
      };
    },
  });

  if (isLoading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: "Total de Documentos",
      value: metrics.totalDocuments,
      icon: FileText,
      color: "text-primary",
      href: "/",
    },
    {
      title: "Docs Expirando",
      value: metrics.expiringDocuments,
      icon: AlertTriangle,
      color: "text-destructive",
      href: "/",
    },
    {
      title: "Itens em Falta",
      value: metrics.lowInventoryItems,
      icon: Package,
      color: "text-yellow-600",
      href: "/inventario",
    },
    {
      title: "Manutenções Pendentes",
      value: metrics.pendingMaintenance,
      icon: Settings,
      color: "text-accent",
      href: "/manutencao",
    },
    {
      title: "Atividades (7 dias)",
      value: metrics.weeklyActivity,
      icon: TrendingUp,
      color: "text-green-600",
      href: "/historico",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {metricCards.map((metric) => {
        const Icon = metric.icon;
        return (
          <Link key={metric.title} to={metric.href}>
            <Card className="transition-all hover:shadow-lg cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};
