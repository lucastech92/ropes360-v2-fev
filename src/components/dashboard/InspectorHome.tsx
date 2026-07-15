import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Briefcase, Award, ArrowRight, MapPin, AlertTriangle, CalendarClock } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCertStatus, getDaysUntilExpiry } from "@/hooks/useCertifications";

/** Inspector-focused home block: today's services + expiring certifications. */
export const InspectorHome = () => {
  const today = format(new Date(), "yyyy-MM-dd");

  const servicesQuery = useQuery({
    queryKey: ["inspector-home-services", today],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Services where inspector is owner OR collaborator, active today
      const { data: collabRows } = await supabase
        .from("service_collaborators")
        .select("service_id")
        .eq("user_id", user.id);
      const collabIds = (collabRows ?? []).map((r) => r.service_id);

      const filters: string[] = [`created_by.eq.${user.id}`];
      if (collabIds.length) filters.push(`id.in.(${collabIds.join(",")})`);

      const { data, error } = await supabase
        .from("services")
        .select("id, codigo_jbr, cliente, local, data_inicio, data_termino")
        .or(filters.join(","))
        .lte("data_inicio", today)
        .gte("data_termino", today)
        .order("data_inicio", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const certsQuery = useQuery({
    queryKey: ["inspector-home-certs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("certifications")
        .select("id, certification_name, expiry_date")
        .eq("user_id", user.id)
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((c) => {
        const d = getDaysUntilExpiry(c.expiry_date);
        return d <= 60; // expiring soon OR expired
      });
    },
    staleTime: 60_000,
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Meus serviços de hoje */}
      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Briefcase className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-base md:text-lg">Meus serviços de hoje</CardTitle>
              <CardDescription>{format(new Date(), "PPP", { locale: ptBR })}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {servicesQuery.isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : !servicesQuery.data || servicesQuery.data.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="Nenhum serviço para hoje"
              description="Quando houver serviços atribuídos a você em andamento, aparecerão aqui."
              className="!p-6"
            />
          ) : (
            <>
              {servicesQuery.data.map((s) => (
                <Link
                  key={s.id}
                  to={`/servico/${s.id}/timeline`}
                  className="group flex items-start justify-between gap-3 rounded-lg border p-3 hover:border-primary/50 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">JBR {s.codigo_jbr}</span>
                      <Badge variant="secondary" className="text-[10px]">Em andamento</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{s.cliente}</p>
                    {s.local && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {s.local}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
                </Link>
              ))}
              <Button variant="ghost" size="sm" asChild className="w-full mt-2">
                <Link to="/servicos">Ver todos os serviços</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Minhas certificações vencendo */}
      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base md:text-lg">Minhas certificações</CardTitle>
              <CardDescription>Vencidas ou vencendo em até 60 dias</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {certsQuery.isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : !certsQuery.data || certsQuery.data.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Tudo em dia"
              description="Nenhuma certificação vencendo nos próximos 60 dias."
              className="!p-6"
            />
          ) : (
            certsQuery.data.map((c) => {
              const status = getCertStatus(c.expiry_date);
              const days = getDaysUntilExpiry(c.expiry_date);
              const isExpired = status === "expired";
              return (
                <div
                  key={c.id}
                  className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
                    isExpired ? "border-destructive/50 bg-destructive/5" : "border-border"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{c.certification_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <CalendarClock className="h-3 w-3" />
                      {format(parseISO(c.expiry_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <Badge variant={isExpired ? "destructive" : "outline"} className="shrink-0">
                    {isExpired ? (
                      <><AlertTriangle className="h-3 w-3 mr-1" /> Vencida</>
                    ) : (
                      `${days}d`
                    )}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

