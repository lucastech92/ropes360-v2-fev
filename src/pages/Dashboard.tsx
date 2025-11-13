import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  AlertTriangle, 
  Package, 
  Settings, 
  TrendingUp,
  ClipboardList,
  Users,
  Activity,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const Dashboard = () => {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard-complete"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Documentos
      const { count: totalDocs } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true });

      const { count: expiringDocs } = await supabase
        .from("documents_expiring_soon")
        .select("*", { count: "exact", head: true });

      // Serviços
      const { data: services } = await supabase
        .from("services")
        .select("*");

      const servicesThisMonth = services?.filter(s => {
        const start = new Date(s.data_inicio || "");
        const now = new Date();
        return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
      }).length || 0;

      // Manutenção
      const { count: totalMaintenance } = await supabase
        .from("maintenance_records")
        .select("*", { count: "exact", head: true });

      const { count: pendingMaintenance } = await supabase
        .from("maintenance_records")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");

      const { count: inProgressMaintenance } = await supabase
        .from("maintenance_records")
        .select("*", { count: "exact", head: true })
        .eq("status", "em andamento");

      const { count: completedMaintenance } = await supabase
        .from("maintenance_records")
        .select("*", { count: "exact", head: true })
        .eq("status", "concluído");

      // Inventário
      const { data: inventory } = await supabase
        .from("inventory")
        .select("*");

      const lowStockItems = inventory?.filter(item => 
        item.min_quantity && item.quantity < item.min_quantity
      ).length || 0;

      const totalItems = inventory?.length || 0;

      // Atividades
      const { count: weeklyActivity } = await supabase
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { data: recentActivities } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      // Checklists
      const { count: totalChecklists } = await supabase
        .from("checklists")
        .select("*", { count: "exact", head: true });

      return {
        documents: {
          total: totalDocs || 0,
          expiring: expiringDocs || 0,
        },
        services: {
          total: services?.length || 0,
          thisMonth: servicesThisMonth,
        },
        maintenance: {
          total: totalMaintenance || 0,
          pending: pendingMaintenance || 0,
          inProgress: inProgressMaintenance || 0,
          completed: completedMaintenance || 0,
        },
        inventory: {
          total: totalItems,
          lowStock: lowStockItems,
        },
        activity: {
          weekly: weeklyActivity || 0,
          recent: recentActivities || [],
        },
        checklists: {
          total: totalChecklists || 0,
        },
      };
    },
  });

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-8 px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maintenanceProgress = dashboardData.maintenance.total > 0
    ? (dashboardData.maintenance.completed / dashboardData.maintenance.total) * 100
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral de todas as operações e métricas do sistema
          </p>
        </div>

        {/* Métricas Principais */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Documentos
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.documents.total}</div>
              {dashboardData.documents.expiring > 0 && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                  <AlertTriangle className="h-3 w-3" />
                  {dashboardData.documents.expiring} expirando em breve
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Serviços JBR
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.services.total}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {dashboardData.services.thisMonth} neste mês
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Inventário
              </CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.inventory.total}</div>
              {dashboardData.inventory.lowStock > 0 && (
                <p className="text-xs text-yellow-600 flex items-center gap-1 mt-2">
                  <AlertTriangle className="h-3 w-3" />
                  {dashboardData.inventory.lowStock} itens abaixo do mínimo
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Atividade Semanal
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.activity.weekly}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Últimos 7 dias
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Status de Manutenção */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Status de Manutenção
              </CardTitle>
              <CardDescription>
                Visão geral das manutenções e seu progresso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progresso Geral</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(maintenanceProgress)}%
                  </span>
                </div>
                <Progress value={maintenanceProgress} className="h-2" />
                
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Pendente</span>
                    </div>
                    <p className="text-2xl font-bold">{dashboardData.maintenance.pending}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Activity className="h-4 w-4" />
                      <span className="text-xs font-medium">Em Andamento</span>
                    </div>
                    <p className="text-2xl font-bold">{dashboardData.maintenance.inProgress}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Concluído</span>
                    </div>
                    <p className="text-2xl font-bold">{dashboardData.maintenance.completed}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Checklists
              </CardTitle>
              <CardDescription>
                Templates disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-4xl font-bold text-primary mb-2">
                  {dashboardData.checklists.total}
                </div>
                <p className="text-sm text-muted-foreground">
                  Templates criados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Atividades Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Atividades Recentes
            </CardTitle>
            <CardDescription>
              Últimas 5 ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.activity.recent.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma atividade registrada ainda
              </p>
            ) : (
              <div className="space-y-4">
                {dashboardData.activity.recent.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                    <div className="mt-1">
                      <Badge variant="outline" className="capitalize">
                        {activity.module}
                      </Badge>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
