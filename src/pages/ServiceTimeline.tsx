import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Calendar, Clock } from "lucide-react";
import { useServiceTimeline } from "@/hooks/useServiceTimeline";
import { ServiceTimelineEvent } from "@/components/service/ServiceTimelineEvent";
import { cn } from "@/lib/utils";

const ServiceTimeline = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { events, serviceInfo, loading, filter, setFilter, eventCategories } = useServiceTimeline(id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {/* Service header */}
        {loading ? (
          <Skeleton className="h-32 w-full mb-6" />
        ) : serviceInfo ? (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl">
                  Timeline — {serviceInfo.codigo_jbr}
                </CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {events.length} eventos
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{serviceInfo.cliente}</span>
                {serviceInfo.local && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {serviceInfo.local}
                  </span>
                )}
                {serviceInfo.data_inicio && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(serviceInfo.data_inicio).toLocaleDateString("pt-BR")}
                    {serviceInfo.data_termino && ` — ${new Date(serviceInfo.data_termino).toLocaleDateString("pt-BR")}`}
                  </span>
                )}
              </div>
              {serviceInfo.escopo && serviceInfo.escopo.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {serviceInfo.escopo.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {eventCategories.map(cat => (
            <Button
              key={cat.key}
              variant={filter === cat.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(cat.key)}
              className="text-xs"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <Skeleton className="h-24 flex-1" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhum evento encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter !== "all" ? "Tente remover o filtro para ver todos os eventos." : "Este serviço ainda não possui eventos registrados."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {events.map((event, index) => (
              <ServiceTimelineEvent
                key={`${event.event_type}-${event.event_date}-${index}`}
                event={event}
                index={index}
                isLast={index === events.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceTimeline;
