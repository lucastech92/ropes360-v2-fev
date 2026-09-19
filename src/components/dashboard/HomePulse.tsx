import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { AlertTriangle, BriefcaseBusiness, ClipboardCheck, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeOverview } from "@/hooks/useHomeOverview";

/** Live operational counters plus the 6-month service trend. */
export const HomePulse = () => {
  const { data, isLoading } = useHomeOverview();

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const counters = [
    {
      label: "JBRs em andamento",
      value: data.activeServices,
      icon: BriefcaseBusiness,
      href: "/servicos",
      tone: "text-primary",
    },
    {
      label: "Checklists ativos",
      value: data.activeChecklists,
      icon: ClipboardCheck,
      href: "/checklist",
      tone: "text-accent",
    },
    {
      label: "Itens no inventário",
      value: data.inventoryItems,
      icon: Package,
      href: "/inventario",
      tone: "text-foreground",
    },
    {
      label: "Abaixo do mínimo",
      value: data.lowStockItems,
      icon: AlertTriangle,
      href: "/inventario",
      tone: data.lowStockItems > 0 ? "text-destructive" : "text-muted-foreground",
    },
  ];

  const hasTrend = data.servicesByMonth.some((m) => m.servicos > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {counters.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.href} className="group">
              <Card className="h-full border-border/60 shadow-card transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Icon className={`h-5 w-5 ${c.tone}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tabular-nums leading-none">{c.value}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{c.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="border-border/60 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Serviços por mês</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          {hasTrend ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data.servicesByMonth} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="homeServices" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="servicos"
                  name="Serviços"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#homeServices)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum serviço registrado nos últimos 6 meses.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
