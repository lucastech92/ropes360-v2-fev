import Header from "@/components/Header";
import { HomeHero } from "@/components/dashboard/HomeHero";
import { HomePulse } from "@/components/dashboard/HomePulse";
import { AlertsSummaryWidget } from "@/components/dashboard/AlertsSummaryWidget";
import { HealthScoreGauge } from "@/components/dashboard/HealthScoreGauge";
import { InspectorHome } from "@/components/dashboard/InspectorHome";
import { HomeAccessHub } from "@/components/dashboard/HomeAccessHub";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const { isInspector } = useUserRole();

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
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="primary-access" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Acessos principais
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Indicadores vivos das áreas mais importantes.</p>
              </div>
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Atualização automática
              </span>
            </div>
            <HomeAccessHub />
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
