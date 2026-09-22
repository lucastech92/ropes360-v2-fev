import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ClipboardList, FileStack, Package, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeAccessHub } from "@/hooks/useHomeAccessHub";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

type TrendDatum = { month: string; value: number };

const TrendChart = ({ data, bar = false }: { data: TrendDatum[]; bar?: boolean }) => (
  <div className="h-16 w-full" aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%">
      {bar ? (
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <Bar dataKey="value" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="hubTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#hubTrend)" />
        </AreaChart>
      )}
    </ResponsiveContainer>
  </div>
);

export const HomeAccessHub = () => {
  const { isAdmin, isModerator, isLoading: roleLoading } = useUserRole();
  const canAccessManagement = isAdmin || isModerator;
  const { data, isLoading } = useHomeAccessHub(canAccessManagement);

  if (isLoading || roleLoading || !data) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-52 w-full" />)}
      </div>
    );
  }

  const accesses = [
    {
      title: "Inventário",
      description: "Estoque, ativos e disponibilidade",
      href: "/inventario",
      icon: Package,
      metric: data.inventory.physicalUnits,
      metricLabel: "unidades físicas",
      detail: `${data.inventory.catalogItems} itens no catálogo`,
      warning: data.inventory.lowStock > 0 ? `${data.inventory.lowStock} abaixo do mínimo` : "Estoque sem alertas",
      warningActive: data.inventory.lowStock > 0,
      chart: <TrendChart data={data.inventory.trend} bar />,
    },
    {
      title: "Atas de Reuniões",
      description: "Decisões, responsáveis e prazos",
      href: "/atas-reuniao",
      icon: ClipboardList,
      metric: data.meetings.openActions,
      metricLabel: "ações em aberto",
      detail: `${data.meetings.minutes} atas nos últimos 6 meses`,
      warning: data.meetings.overdueActions > 0 ? `${data.meetings.overdueActions} ações atrasadas` : "Prazos em dia",
      warningActive: data.meetings.overdueActions > 0,
      chart: <TrendChart data={data.meetings.trend} />,
      restricted: true,
    },
    {
      title: "Modelos",
      description: "Pacotes LS BR e arquivos técnicos",
      href: "/modelos-relatorios",
      icon: FileStack,
      metric: data.models.packages,
      metricLabel: "pacotes cadastrados",
      detail: `${data.models.files} arquivos associados`,
      warning: "Certificados, SLB/MRT e inspeções",
      warningActive: false,
      chart: <TrendChart data={data.models.trend} />,
    },
    {
      title: "Gestão",
      description: "Equipe, cargos e aprovações",
      href: "/gerenciar-usuarios",
      icon: Users,
      metric: data.management.approvedUsers,
      metricLabel: "usuários aprovados",
      detail: `${data.management.pendingUsers} aguardando aprovação`,
      warning: data.management.pendingUsers > 0 ? "Requer atenção" : "Acessos em dia",
      warningActive: data.management.pendingUsers > 0,
      chart: <TrendChart data={data.management.roles} bar />,
      restricted: true,
    },
  ].filter((access) => !access.restricted || canAccessManagement);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {accesses.map((access) => {
        const Icon = access.icon;
        return (
          <Link key={access.href} to={access.href} className="group block">
            <Card className="h-full overflow-hidden border-border/70 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold leading-tight">{access.title}</h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{access.description}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold tabular-nums">{access.metric}</span>
                      <span className="text-xs text-muted-foreground">{access.metricLabel}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{access.detail}</p>
                  </div>
                  <div className="w-28 shrink-0">{access.chart}</div>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t pt-3">
                  <span className={cn("h-1.5 w-1.5 rounded-full", access.warningActive ? "bg-destructive" : "bg-success")} />
                  <span className={cn("text-xs font-medium", access.warningActive ? "text-destructive" : "text-muted-foreground")}>
                    {access.warning}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};