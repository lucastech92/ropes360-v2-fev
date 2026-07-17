import { Link } from "react-router-dom";
import { BookOpen, BriefcaseBusiness, ClipboardCheck, Compass, Package } from "lucide-react";
import Header from "@/components/Header";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { HealthScoreGauge } from "@/components/dashboard/HealthScoreGauge";
import { InspectorHome } from "@/components/dashboard/InspectorHome";
import { CommandPaletteTrigger } from "@/components/CommandPalette";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";

const primaryLinks = [
  { label: "JBRs e serviços", description: "Planejar e acompanhar serviços", href: "/servicos", icon: BriefcaseBusiness },
  { label: "Checklists", description: "Preparar e conferir materiais", href: "/checklist", icon: ClipboardCheck },
  { label: "Inventário", description: "Consultar estoque e equipamentos", href: "/inventario", icon: Package },
  { label: "Conhecimento técnico", description: "Consultar documentos e a IA", href: "/assistente-tecnico", icon: BookOpen },
];

const Index = () => {
  const { isInspector } = useUserRole();

  return <div className="min-h-screen bg-background">
    <Header />
    <main>
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-muted/60">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-primary/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-8 -top-12 h-48 w-48 rounded-full border border-primary/15" aria-hidden="true" />
        <div className="container relative flex flex-col gap-6 px-4 py-8 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Compass className="h-4 w-4" /> Gestão operacional integrada
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Ropes<span className="text-primary">360</span></h1>
            <p className="mt-4 text-lg font-medium leading-relaxed text-foreground sm:text-xl">
              Conectar pessoas, equipamentos e decisões para tornar cada serviço de campo mais seguro, rastreável e eficiente.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Do planejamento do JBR ao retorno dos recursos, toda a operação em um único fluxo.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild><Link to="/novo-servico">Novo JBR</Link></Button>
            <CommandPaletteTrigger />
          </div>
        </div>
      </section>

      <div className="container space-y-8 px-4 py-6">
        <section aria-labelledby="operation-summary" className="space-y-4">
          <h2 id="operation-summary" className="text-base font-semibold">Resumo da operação</h2>
          {isInspector ? <InspectorHome /> : <><HealthScoreGauge compact /><DashboardMetrics /></>}
        </section>

        <section aria-labelledby="primary-access" className="space-y-3">
          <h2 id="primary-access" className="text-base font-semibold">Acessos principais</h2>
          <div className="grid overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-4">
            {primaryLinks.map((item, index) => {
              const Icon = item.icon;
              return <Link key={item.href} to={item.href} className={`group flex min-h-24 items-start gap-3 p-4 transition-colors hover:bg-muted/50 ${index > 0 ? "border-t sm:border-t-0 sm:border-l" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t lg:border-l lg:border-t-0" : ""} ${index === 3 ? "sm:border-t lg:border-t-0" : ""}`}>
                <div className="mt-0.5 rounded-md bg-muted p-2"><Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" /></div>
                <div><p className="text-sm font-medium">{item.label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p></div>
              </Link>;
            })}
          </div>
        </section>
      </div>
    </main>
  </div>;
};

export default Index;
