import { Link } from "react-router-dom";
import { BookOpen, BriefcaseBusiness, ClipboardCheck, Package, ArrowRight, ClipboardList, Users } from "lucide-react";
import Header from "@/components/Header";
import { HomeHero } from "@/components/dashboard/HomeHero";
import { HomePulse } from "@/components/dashboard/HomePulse";
import { AlertsSummaryWidget } from "@/components/dashboard/AlertsSummaryWidget";
import { HealthScoreGauge } from "@/components/dashboard/HealthScoreGauge";
import { InspectorHome } from "@/components/dashboard/InspectorHome";
import { useUserRole } from "@/hooks/useUserRole";

const hubLinks = [
  { label: "JBRs e serviços", description: "Planejar e acompanhar serviços", href: "/servicos", icon: BriefcaseBusiness },
  { label: "Checklists", description: "Preparar e conferir materiais", href: "/checklist", icon: ClipboardCheck },
  { label: "Ativos e equipamentos", description: "Estoque, calibração e manutenção", href: "/inventario", icon: Package },
  { label: "Conhecimento técnico", description: "Documentos e assistente de IA", href: "/assistente-tecnico", icon: BookOpen },
  { label: "Certificações", description: "Competências e validades da equipe", href: "/certificacoes", icon: Users },
  { label: "Atas de reuniões", description: "Decisões, ações e responsáveis", href: "/atas-reuniao", icon: ClipboardList, restricted: true },
];

const Index = () => {
  const { isInspector } = useUserRole();
  const links = hubLinks.filter((l) => !(l.restricted && isInspector));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HomeHero />

        <div className="container space-y-8 px-4 py-6">
          <AlertsSummaryWidget />

          <section aria-labelledby="operation-summary" className="space-y-4">
            <h2 id="operation-summary" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pulso da operação
            </h2>
            {isInspector ? (
              <InspectorHome />
            ) : (
              <div className="space-y-4">
                <HomePulse />
                <HealthScoreGauge compact />
              </div>
            )}
          </section>

          <section aria-labelledby="primary-access" className="space-y-4">
            <h2 id="primary-access" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Hub operacional
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {links.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="group flex items-start gap-3 rounded-xl border bg-card p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <div className="mt-0.5 rounded-lg bg-muted p-2 transition-colors group-hover:bg-primary/10">
                      <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
