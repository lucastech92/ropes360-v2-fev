import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import ModuleCard from "@/components/ModuleCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  AlertTriangle, 
  Package, 
  Settings, 
  TrendingUp,
  ClipboardList,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bot,
  FileBarChart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { InventoryDetailsDialog } from "@/components/dashboard/InventoryDetailsDialog";
import { ServicesDetailsDialog } from "@/components/dashboard/ServicesDetailsDialog";
import { MaintenanceDetailsDialog } from "@/components/dashboard/MaintenanceDetailsDialog";
import { ServicesEvolutionChart } from "@/components/dashboard/ServicesEvolutionChart";
import { MaintenanceTypeChart } from "@/components/dashboard/MaintenanceTypeChart";
import { InventoryTrendsChart } from "@/components/dashboard/InventoryTrendsChart";
import { HealthScoreGauge } from "@/components/dashboard/HealthScoreGauge";

const Dashboard = () => {
  const { t } = useTranslation();
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
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
        .select("*")
        .throwOnError();

      const servicesThisMonth = services?.filter(s => {
        if (!s.data_inicio) return false;
        const start = new Date(s.data_inicio);
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
        .select("*")
        .throwOnError();

      const lowStockItems = inventory?.filter(item => 
        item.min_quantity && item.quantity < item.min_quantity
      ).length || 0;

      const totalItems = inventory?.length || 0;

      // Manutenção detalhada
      const { data: allMaintenance } = await supabase
        .from("maintenance_records")
        .select("*")
        .throwOnError();

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
          data: services || [],
        },
        maintenance: {
          total: totalMaintenance || 0,
          pending: pendingMaintenance || 0,
          inProgress: inProgressMaintenance || 0,
          completed: completedMaintenance || 0,
          data: allMaintenance || [],
        },
        inventory: {
          total: totalItems,
          lowStock: lowStockItems,
          data: inventory || [],
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
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.overview')}
          </p>
        </div>

        {/* Assistente Técnico */}
        <div className="mb-8">
          <ModuleCard
            title={t('modules.assistenteTecnico')}
            description={t('dashboard.assistantDescription')}
            icon={Bot}
            href="/assistente-tecnico"
            color="primary"
          />
        </div>

        {/* Relatório Executivo */}
        <div className="mb-8">
          <ModuleCard
            title="Relatório Executivo"
            description="Resumo operacional com IA e recomendações estratégicas para diretoria"
            icon={FileBarChart}
            href="/relatorio-executivo"
            color="accent"
          />
        </div>

        <div className="mb-8">
          <HealthScoreGauge />
        </div>

        {/* Métricas Principais */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-primary/20" onClick={() => {}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.totalDocuments')}
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.documents.total}</div>
              {dashboardData.documents.expiring > 0 && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                  <AlertTriangle className="h-3 w-3" />
                  {dashboardData.documents.expiring} {t('dashboard.expiringSoon')}
                </p>
              )}
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-xl transition-all cursor-pointer border-accent/30 hover:border-accent group" 
            onClick={() => setServicesDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.servicesJBR')}
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.services.total}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {dashboardData.services.thisMonth} {t('dashboard.thisMonth')}
                </p>
                <ArrowRight className="h-3 w-3 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-xl transition-all cursor-pointer border-primary/30 hover:border-primary group" 
            onClick={() => setInventoryDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('inventory.title')}
              </CardTitle>
              <Package className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.inventory.total}</div>
              <div className="flex items-center justify-between mt-2">
                {dashboardData.inventory.lowStock > 0 ? (
                  <p className="text-xs text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {dashboardData.inventory.lowStock} {t('dashboard.lowItems')}
                  </p>
                ) : (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('dashboard.stockOk')}
                  </p>
                )}
                <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.weeklyActivity')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.activity.weekly}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('dashboard.last7Days')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Status de Manutenção */}
          <Card 
            className="lg:col-span-2 hover:shadow-xl transition-all cursor-pointer border-muted hover:border-primary/50 group"
            onClick={() => setMaintenanceDialogOpen(true)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {t('dashboard.maintenanceStatus')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.maintenanceOverview')}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('dashboard.viewDetails')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('dashboard.overallProgress')}</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(maintenanceProgress)}%
                  </span>
                </div>
                <Progress value={maintenanceProgress} className="h-2" />
                
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">{t('maintenance.statusOptions.pending')}</span>
                    </div>
                    <p className="text-2xl font-bold">{dashboardData.maintenance.pending}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Activity className="h-4 w-4" />
                      <span className="text-xs font-medium">{t('maintenance.statusOptions.inProgress')}</span>
                    </div>
                    <p className="text-2xl font-bold">{dashboardData.maintenance.inProgress}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-medium">{t('maintenance.statusOptions.completed')}</span>
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
                {t('modules.checkLists')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.availableTemplates')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-4xl font-bold text-primary mb-2">
                  {dashboardData.checklists.total}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.templatesCreated')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos Analíticos */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolução de Serviços
              </CardTitle>
              <CardDescription>
                Serviços executados nos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServicesEvolutionChart services={dashboardData.services.data} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Tipos de Manutenção
              </CardTitle>
              <CardDescription>
                Distribuição por tipo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenanceTypeChart maintenanceRecords={dashboardData.maintenance.data} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Análise de Inventário
              </CardTitle>
              <CardDescription>
                Itens por categoria e status de estoque
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryTrendsChart inventory={dashboardData.inventory.data} />
            </CardContent>
          </Card>

          {/* Atividades Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t('dashboard.recentActivities')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.last5Actions')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.activity.recent.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('dashboard.noActivity')}
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

        {/* Dialogs */}
        <InventoryDetailsDialog
          open={inventoryDialogOpen}
          onOpenChange={setInventoryDialogOpen}
          inventory={dashboardData.inventory.data}
        />

        <ServicesDetailsDialog
          open={servicesDialogOpen}
          onOpenChange={setServicesDialogOpen}
          services={dashboardData.services.data}
        />

        <MaintenanceDetailsDialog
          open={maintenanceDialogOpen}
          onOpenChange={setMaintenanceDialogOpen}
          maintenanceRecords={dashboardData.maintenance.data}
        />
      </div>
    </div>
  );
};

export default Dashboard;
