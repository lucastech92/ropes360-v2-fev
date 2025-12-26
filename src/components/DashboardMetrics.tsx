import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileText, Package, Settings, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export const DashboardMetrics = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics", userId],
    queryFn: async () => {
      if (!userId) return null;

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
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      return {
        totalDocuments: docsCount || 0,
        expiringDocuments: expiringCount || 0,
        lowInventoryItems: lowInventory?.length || 0,
        pendingMaintenance: pendingMaintenance || 0,
        weeklyActivity: activityCount || 0,
      };
    },
    enabled: !!userId,
  });

  if (isLoading || !metrics) {
    return (
      <div className="grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-2">
              <div className="h-3 md:h-4 w-16 md:w-24 bg-muted rounded shimmer" />
              <div className="h-3 md:h-4 w-3 md:w-4 bg-muted rounded shimmer" />
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="h-6 md:h-8 w-12 md:w-16 bg-muted rounded shimmer" />
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
    <div className="grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 animate-fade-in">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Link key={metric.title} to={metric.href} style={{ animationDelay: `${index * 100}ms` }}>
            <Card className="card-hover group relative overflow-hidden h-full">
              <div className="absolute inset-0 bg-gradient-mesh opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2 relative z-10">
                <CardTitle className="text-xs md:text-sm font-medium transition-colors group-hover:text-primary line-clamp-1">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-3 w-3 md:h-4 md:w-4 shrink-0 ${metric.color} transition-transform group-hover:scale-110`} />
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0 relative z-10">
                <div className="text-xl md:text-2xl font-bold transition-all group-hover:scale-105">{metric.value}</div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};
