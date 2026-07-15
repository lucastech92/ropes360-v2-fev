import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useServiceTimeline } from "@/hooks/useServiceTimeline";
import { ServiceTimelineEvent } from "@/components/service/ServiceTimelineEvent";
import { ServicePhaseStepper } from "@/components/service/ServicePhaseStepper";
import { getNextServiceStatus, getServicePhase, type ServiceOperationalStatus } from "@/lib/serviceLifecycle";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ServiceDocumentCenter } from "@/components/service/ServiceDocumentCenter";
import { ServiceChecklistsPanel } from "@/components/service/ServiceChecklistsPanel";
import { ServiceLogisticsPanel } from "@/components/service/ServiceLogisticsPanel";
import { ServiceReturnPanel } from "@/components/service/ServiceReturnPanel";
import { ServiceInventoryMovementsPanel } from "@/components/service/ServiceInventoryMovementsPanel";

const ServiceTimeline = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { events, serviceInfo, loading, filter, setFilter, eventCategories, refresh } = useServiceTimeline(id);
  const { isAdmin, isModerator } = useUserRole();
  const { toast } = useToast();
  const [updatingPhase, setUpdatingPhase] = useState(false);
  const [operationalRefreshKey, setOperationalRefreshKey] = useState(0);
  const currentPhase = getServicePhase(serviceInfo?.operational_status);
  const nextStatus = getNextServiceStatus(serviceInfo?.operational_status);

  const refreshOperationalData = () => { refresh(); setOperationalRefreshKey(value => value + 1); };
  const advancePhase = async () => {
    if (!id || !nextStatus) return;
    setUpdatingPhase(true);
    const { error } = await supabase.from("services").update({ operational_status: nextStatus }).eq("id", id);
    if (error) toast({ title: "Não foi possível avançar o JBR", description: error.message, variant: "destructive" });
    else { toast({ title: "Fase atualizada", description: `JBR movido para ${getServicePhase(nextStatus).label}.` }); refresh(); }
    setUpdatingPhase(false);
  };

  return <div className="min-h-screen bg-background">
    <Header />
    <main className="container max-w-6xl px-4 py-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-3 -ml-2"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>

      {loading ? <Skeleton className="mb-6 h-40 w-full" /> : serviceInfo ? <section className="mb-6 border-b pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">{serviceInfo.codigo_jbr}</h1><Badge variant="secondary">{currentPhase.label}</Badge></div><p className="mt-1 text-base font-medium">{serviceInfo.cliente}</p></div>
          {(isAdmin || isModerator) && nextStatus && <Button size="sm" onClick={advancePhase} disabled={updatingPhase}>{updatingPhase ? "Atualizando..." : `Avançar para ${getServicePhase(nextStatus).label}`}</Button>}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {serviceInfo.local && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{serviceInfo.local}</span>}
          {serviceInfo.data_inicio && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(serviceInfo.data_inicio).toLocaleDateString("pt-BR")}{serviceInfo.data_termino && ` — ${new Date(serviceInfo.data_termino).toLocaleDateString("pt-BR")}`}</span>}
          <span><span className="text-muted-foreground">Responsável: </span>{serviceInfo.responsible_name || "Coordenador do JBR"}</span>
        </div>
        {serviceInfo.escopo?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{serviceInfo.escopo.map((scope, index) => <Badge key={index} variant="outline" className="text-xs">{scope}</Badge>)}</div> : null}
        <div className="mt-4"><ServicePhaseStepper status={serviceInfo.operational_status as ServiceOperationalStatus} /></div>
      </section> : null}

      {serviceInfo && <div className="grid items-start gap-5 lg:grid-cols-2"><ServiceChecklistsPanel serviceId={serviceInfo.id} jbrCode={serviceInfo.codigo_jbr} /><ServiceLogisticsPanel serviceId={serviceInfo.id} containerId={serviceInfo.logistics_container_id} releasedAt={serviceInfo.logistics_released_at} canManage={isAdmin || isModerator} onChanged={refreshOperationalData} /></div>}
      {serviceInfo && <ServiceDocumentCenter serviceId={serviceInfo.id} client={serviceInfo.cliente} scope={serviceInfo.escopo ?? []} />}
      {serviceInfo && <ServiceReturnPanel serviceId={serviceInfo.id} onChanged={refreshOperationalData} />}
      {serviceInfo && <ServiceInventoryMovementsPanel serviceId={serviceInfo.id} refreshKey={operationalRefreshKey} />}

      <details className="mb-6 rounded-lg border bg-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">Histórico do JBR <span className="ml-1 font-normal text-muted-foreground">· {events.length} evento(s)</span></summary>
        <div className="border-t p-4">
          <div className="mb-6 flex flex-wrap gap-2">{eventCategories.map(category => <Button key={category.key} variant={filter === category.key ? "default" : "outline"} size="sm" onClick={() => setFilter(category.key)} className="text-xs">{category.label}</Button>)}</div>
          {loading ? <div className="space-y-4">{[1,2,3,4].map(item => <div key={item} className="flex gap-4"><Skeleton className="h-10 w-10 shrink-0 rounded-full" /><Skeleton className="h-24 flex-1" /></div>)}</div>
          : events.length === 0 ? <Card><CardContent className="py-10 text-center"><Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Nenhum evento encontrado</p><p className="mt-1 text-sm text-muted-foreground">{filter !== "all" ? "Remova o filtro para ver todos os eventos." : "Este JBR ainda não possui eventos registrados."}</p></CardContent></Card>
          : <div className="relative">{events.map((event, index) => <ServiceTimelineEvent key={`${event.event_type}-${event.event_date}-${index}`} event={event} index={index} isLast={index === events.length - 1} />)}</div>}
        </div>
      </details>
    </main>
  </div>;
};

export default ServiceTimeline;
