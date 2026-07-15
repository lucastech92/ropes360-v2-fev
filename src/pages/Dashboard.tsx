import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Container,
  PackageX,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";
import Header from "@/components/Header";
import { DashboardSkeleton } from "@/components/skeletons/AppSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getServicePhase, SERVICE_PHASES } from "@/lib/serviceLifecycle";

const PHASE_STYLE: Record<string, string> = {
  planning: "border-slate-300 text-slate-700",
  preparation: "border-amber-300 text-amber-700",
  logistics: "border-violet-300 text-violet-700",
  field: "border-blue-300 text-blue-700",
  documentation: "border-cyan-300 text-cyan-700",
  technical_review: "border-orange-300 text-orange-700",
  return: "border-fuchsia-300 text-fuchsia-700",
  completed: "border-emerald-300 text-emerald-700",
};

const MOVEMENT_LABEL: Record<string, string> = {
  dispatch: "Embarque",
  return: "Retorno",
  consumption: "Consumo",
  missing: "Ausente",
  damaged: "Danificado",
  maintenance: "Manutenção",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["operational-dashboard"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const now = new Date();
      const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        servicesResult,
        containersResult,
        inventoryResult,
        certificationsResult,
        checklistsResult,
        returnsResult,
        returnItemsResult,
        movementsResult,
        maintenanceResult,
      ] = await Promise.all([
        supabase
          .from("services")
          .select("id, codigo_jbr, cliente, local, escopo, data_inicio, data_termino, created_at, operational_status, logistics_released_at")
          .order("created_at", { ascending: false }),
        supabase.from("operation_containers").select("id, name, status, assigned_service_id"),
        supabase.from("inventory").select("id, item_name, item_type, quantity, min_quantity, status, next_calibration"),
        supabase.from("certifications").select("id, certification_name, expiry_date, user_id"),
        supabase
          .from("service_checklists")
          .select("service_id, checklists:checklist_id(checklist_items(id, is_checked))"),
        supabase.from("service_return_sessions").select("id, service_id, status, inventory_applied_at"),
        supabase.from("service_return_items").select("return_session_id, dispatched_quantity, returned_quantity, return_condition, checked_at"),
        supabase
          .from("service_inventory_movements")
          .select("id, service_id, movement_type, quantity, created_at, services:service_id(codigo_jbr), inventory:inventory_item_id(item_name, unit)")
          .order("created_at", { ascending: false })
          .limit(12),
        supabase.from("maintenance_records").select("id, equipment_name, status, scheduled_date, priority"),
      ]);

      const firstError = [
        servicesResult.error,
        containersResult.error,
        inventoryResult.error,
        certificationsResult.error,
        checklistsResult.error,
        returnsResult.error,
        returnItemsResult.error,
        movementsResult.error,
        maintenanceResult.error,
      ].find(Boolean);
      if (firstError) throw firstError;

      const services = servicesResult.data ?? [];
      const containers = containersResult.data ?? [];
      const inventory = inventoryResult.data ?? [];
      const certifications = certificationsResult.data ?? [];
      const returns = returnsResult.data ?? [];
      const returnItems = returnItemsResult.data ?? [];
      const movements = movementsResult.data ?? [];
      const maintenance = maintenanceResult.data ?? [];

      const activeServices = services.filter((service) => service.operational_status !== "completed");
      const phaseCounts = Object.fromEntries(
        SERVICE_PHASES.map((phase) => [phase.value, services.filter((service) => service.operational_status === phase.value).length]),
      );

      const pendingChecklistServiceIds = new Set<string>();
      (checklistsResult.data ?? []).forEach((link: any) => {
        const items = link.checklists?.checklist_items ?? [];
        if (items.length === 0 || items.some((item: { is_checked: boolean }) => !item.is_checked)) {
          pendingChecklistServiceIds.add(link.service_id);
        }
      });

      const returnItemsBySession = new Map<string, typeof returnItems>();
      returnItems.forEach((item) => {
        returnItemsBySession.set(item.return_session_id, [...(returnItemsBySession.get(item.return_session_id) ?? []), item]);
      });
      const pendingReturns = returns.filter((session) => {
        const items = returnItemsBySession.get(session.id) ?? [];
        return session.status !== "completed" || !session.inventory_applied_at || items.some((item) => !item.checked_at);
      });
      const divergentReturns = returnItems.filter((item) =>
        item.checked_at && (
          (item.returned_quantity ?? 0) < item.dispatched_quantity
          || ["damaged", "maintenance", "missing"].includes(item.return_condition ?? "")
        ),
      );

      const lowStock = inventory.filter((item) =>
        item.min_quantity !== null && (item.quantity ?? 0) <= item.min_quantity,
      );
      const unavailableEquipment = inventory.filter((item) =>
        item.item_type === "equipamento" && (item.status !== "available" || (item.quantity ?? 0) <= 0),
      );
      const expiringCertifications = certifications.filter((certification) => {
        const expiry = new Date(`${certification.expiry_date}T12:00:00`);
        return expiry <= inThirtyDays;
      });
      const expiredCertifications = expiringCertifications.filter((certification) =>
        new Date(`${certification.expiry_date}T12:00:00`) < now,
      );
      const pendingMaintenance = maintenance.filter((record) =>
        !["concluído", "completed"].includes(record.status?.toLowerCase() ?? ""),
      );
      const urgentMaintenance = pendingMaintenance.filter((record) =>
        record.scheduled_date && new Date(`${record.scheduled_date}T12:00:00`) <= inThirtyDays,
      );
      const consumptionLast30Days = movements
        .filter((movement) => movement.movement_type === "consumption" && new Date(movement.created_at) >= thirtyDaysAgo)
        .reduce((sum, movement) => sum + movement.quantity, 0);

      return {
        services,
        activeServices,
        phaseCounts,
        containers,
        inventory,
        certifications,
        pendingChecklistServiceIds,
        pendingReturns,
        divergentReturns,
        lowStock,
        unavailableEquipment,
        expiringCertifications,
        expiredCertifications,
        urgentMaintenance,
        movements,
        consumptionLast30Days,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8"><DashboardSkeleton /></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Card className="mx-auto max-w-xl border-destructive/40">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <h1 className="text-xl font-semibold">Não foi possível carregar o dashboard</h1>
              <p className="text-sm text-muted-foreground">Atualize a página. Se o erro continuar, verifique se todas as migrações foram aplicadas no Lovable Cloud.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const attentionCount = data.lowStock.length
    + data.unavailableEquipment.length
    + data.expiredCertifications.length
    + data.pendingReturns.length
    + data.pendingChecklistServiceIds.size
    + data.divergentReturns.length;

  const alerts = [
    data.pendingReturns.length > 0 && {
      title: `${data.pendingReturns.length} retorno(s) exigem fechamento`,
      description: "Existem conferências pendentes ou ainda não aplicadas ao estoque.",
      href: "/servicos",
      tone: "text-fuchsia-700",
      icon: ClipboardCheck,
    },
    data.pendingChecklistServiceIds.size > 0 && {
      title: `${data.pendingChecklistServiceIds.size} JBR(s) com checklist pendente`,
      description: "Há itens ainda não conferidos nos checklists vinculados.",
      href: "/servicos",
      tone: "text-amber-700",
      icon: ClipboardCheck,
    },
    data.divergentReturns.length > 0 && {
      title: `${data.divergentReturns.length} divergência(s) de retorno`,
      description: "Materiais consumidos, ausentes, danificados ou enviados para manutenção.",
      href: "/servicos",
      tone: "text-red-700",
      icon: PackageX,
    },
    data.lowStock.length > 0 && {
      title: `${data.lowStock.length} item(ns) abaixo do mínimo`,
      description: data.lowStock.slice(0, 3).map((item) => item.item_name).join(" · "),
      href: "/inventario",
      tone: "text-amber-700",
      icon: PackageX,
    },
    data.unavailableEquipment.length > 0 && {
      title: `${data.unavailableEquipment.length} equipamento(s) indisponíveis`,
      description: "Em campo, manutenção, inativos ou sem saldo disponível.",
      href: "/inventario?tab=items&type=equipamento",
      tone: "text-red-700",
      icon: Wrench,
    },
    data.expiringCertifications.length > 0 && {
      title: `${data.expiringCertifications.length} certificação(ões) vencidas ou vencendo`,
      description: `${data.expiredCertifications.length} já estão vencidas.`,
      href: "/certificacoes",
      tone: "text-orange-700",
      icon: ShieldAlert,
    },
    data.urgentMaintenance.length > 0 && {
      title: `${data.urgentMaintenance.length} manutenção(ões) próximas ou atrasadas`,
      description: "Verifique prioridade e disponibilidade antes dos próximos JBRs.",
      href: "/inventario?tab=maintenance",
      tone: "text-violet-700",
      icon: Clock3,
    },
  ].filter(Boolean) as Array<{ title: string; description: string; href: string; tone: string; icon: typeof AlertTriangle }>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Visão do coordenador</p>
            <h1 className="mt-1 text-3xl font-bold">Operação Ropes360</h1>
            <p className="mt-2 text-muted-foreground">O que está acontecendo, o que exige atenção e onde agir agora.</p>
          </div>
          <Button onClick={() => navigate("/novo-servico")}>
            <BriefcaseBusiness className="mr-2 h-4 w-4" /> Criar JBR
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="JBRs ativos"
            value={data.activeServices.length}
            description={`${data.phaseCounts.field ?? 0} em campo`}
            icon={BriefcaseBusiness}
            onClick={() => navigate("/servicos")}
          />
          <MetricCard
            title="Containers"
            value={data.containers.filter((container) => container.status === "available").length}
            description={`${data.containers.filter((container) => container.status !== "available").length} reservados ou indisponíveis`}
            icon={Container}
            onClick={() => navigate("/servicos")}
          />
          <MetricCard
            title="Atenções operacionais"
            value={attentionCount}
            description="Estoque, equipamentos, certificados e retornos"
            icon={AlertTriangle}
            tone={attentionCount > 0 ? "text-amber-600" : "text-emerald-600"}
          />
          <MetricCard
            title="Consumo em 30 dias"
            value={data.consumptionLast30Days}
            description="Unidades consolidadas nos retornos"
            icon={Boxes}
            onClick={() => navigate("/inventario")}
          />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Fluxo dos JBRs</h2>
              <p className="text-sm text-muted-foreground">Distribuição atual dos serviços pelas etapas operacionais.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_PHASES.filter((phase) => phase.value !== "completed").map((phase) => (
              <button
                key={phase.value}
                type="button"
                onClick={() => navigate("/servicos")}
                className="rounded-xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className={PHASE_STYLE[phase.value]}>{phase.label}</Badge>
                  <span className="text-2xl font-bold">{data.phaseCounts[phase.value] ?? 0}</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{phase.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Exige atenção</CardTitle>
              <CardDescription>Alertas priorizados com acesso direto à ação necessária.</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" /> Nenhuma pendência crítica identificada.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => {
                    const Icon = alert.icon;
                    return (
                      <button
                        key={alert.title}
                        type="button"
                        onClick={() => navigate(alert.href)}
                        className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-muted/40"
                      >
                        <Icon className={`h-5 w-5 shrink-0 ${alert.tone}`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{alert.title}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{alert.description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> JBRs em andamento</CardTitle>
              <CardDescription>Serviços mais recentes que ainda não foram concluídos.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.activeServices.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum JBR ativo.</p>
              ) : (
                <div className="space-y-3">
                  {data.activeServices.slice(0, 6).map((service) => {
                    const phase = getServicePhase(service.operational_status);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => navigate(`/servico/${service.id}/timeline`)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{service.codigo_jbr}</p>
                          <p className="truncate text-xs text-muted-foreground">{service.cliente}{service.local ? ` · ${service.local}` : ""}</p>
                        </div>
                        <Badge variant="outline" className={PHASE_STYLE[phase.value]}>{phase.label}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5" /> Últimas movimentações</CardTitle>
                <CardDescription>Embarques, retornos, consumos e divergências consolidados por JBR.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/inventario")}>Abrir estoque</Button>
            </CardHeader>
            <CardContent>
              {data.movements.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação operacional registrada.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {data.movements.map((movement: any) => (
                    <button
                      key={movement.id}
                      type="button"
                      onClick={() => navigate(`/servico/${movement.service_id}/timeline`)}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{movement.inventory?.item_name || "Item de estoque"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {movement.services?.codigo_jbr || "JBR"} · {movement.quantity} {movement.inventory?.unit || "un"}
                        </p>
                      </div>
                      <Badge variant="outline">{MOVEMENT_LABEL[movement.movement_type] || movement.movement_type}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = "text-primary",
  onClick,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof AlertTriangle;
  tone?: string;
  onClick?: () => void;
}) => (
  <Card className={onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md" : ""} onClick={onClick}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <div className="rounded-xl bg-muted p-2.5"><Icon className={`h-5 w-5 ${tone}`} /></div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export default Dashboard;
