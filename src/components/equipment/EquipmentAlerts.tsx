import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle, 
  Calendar, 
  Wrench, 
  Clock, 
  RefreshCw,
  ChevronRight,
  Bell,
  Loader2
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CalibrationAlert {
  id: string;
  name: string;
  code: string;
  next_calibration: string;
  daysUntil: number;
}

interface MaintenanceAlert {
  id: string;
  name: string;
  code: string;
  condition: string;
}

interface IdleAlert {
  id: string;
  name: string;
  code: string;
  updated_at: string;
  daysSinceUpdate: number;
}

interface Alerts {
  calibration: CalibrationAlert[];
  maintenance: MaintenanceAlert[];
  idle: IdleAlert[];
}

const EquipmentAlerts = () => {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alerts>({ calibration: [], maintenance: [], idle: [] });
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("equipment-ai", {
        body: { action: "check_alerts" },
      });

      if (error) throw error;

      // Process calibration alerts with days until
      const calibrationAlerts = (data.alerts?.calibration || []).map((eq: any) => ({
        ...eq,
        daysUntil: differenceInDays(new Date(eq.next_calibration), new Date()),
      })).sort((a: CalibrationAlert, b: CalibrationAlert) => a.daysUntil - b.daysUntil);

      // Process idle equipment with days since update
      const idleAlerts = (data.alerts?.idle || []).map((eq: any) => ({
        ...eq,
        daysSinceUpdate: differenceInDays(new Date(), new Date(eq.updated_at)),
      }));

      setAlerts({
        calibration: calibrationAlerts,
        maintenance: data.alerts?.maintenance || [],
        idle: idleAlerts,
      });
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar alertas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAlerts = alerts.calibration.length + alerts.maintenance.length + alerts.idle.length;

  const getCalibrationSeverity = (daysUntil: number) => {
    if (daysUntil < 0) return { color: "text-destructive", bg: "bg-destructive/10", label: "Vencido" };
    if (daysUntil <= 7) return { color: "text-destructive", bg: "bg-destructive/10", label: "Crítico" };
    if (daysUntil <= 15) return { color: "text-amber-500", bg: "bg-amber-500/10", label: "Atenção" };
    return { color: "text-blue-500", bg: "bg-blue-500/10", label: "Em breve" };
  };

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      needs_repair: "Precisa Reparo",
      damaged: "Danificado",
      fair: "Regular",
    };
    return labels[condition] || condition;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (totalAlerts === 0) {
    return (
      <Card className="border-border/50 border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 py-6">
          <div className="p-2 rounded-full bg-emerald-500/10">
            <Bell className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              Nenhum alerta pendente
            </p>
            <p className="text-sm text-muted-foreground">
              Todos os equipamentos estão em dia
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAlerts}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Alertas Inteligentes</h3>
          <Badge variant="secondary" className="ml-2">
            {totalAlerts} {totalAlerts === 1 ? "alerta" : "alertas"}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchAlerts}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Calibration Alerts */}
        <Card className={cn(
          "border-border/50",
          alerts.calibration.length > 0 && "border-amber-500/30"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              Calibração Próxima
              {alerts.calibration.length > 0 && (
                <Badge variant="outline" className="ml-auto text-amber-500 border-amber-500/50">
                  {alerts.calibration.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.calibration.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum equipamento</p>
            ) : (
              alerts.calibration.slice(0, 5).map((eq) => {
                const severity = getCalibrationSeverity(eq.daysUntil);
                return (
                  <div
                    key={eq.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      severity.bg
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{eq.code}</p>
                      <p className="text-xs text-muted-foreground truncate">{eq.name}</p>
                    </div>
                    <div className="text-right ml-2">
                      <Badge variant="outline" className={cn("text-xs", severity.color)}>
                        {eq.daysUntil < 0 
                          ? `${Math.abs(eq.daysUntil)}d atrás`
                          : eq.daysUntil === 0 
                            ? "Hoje"
                            : `${eq.daysUntil}d`
                        }
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(eq.next_calibration), "dd/MM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            {alerts.calibration.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver mais {alerts.calibration.length - 5}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Alerts */}
        <Card className={cn(
          "border-border/50",
          alerts.maintenance.length > 0 && "border-destructive/30"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4 text-destructive" />
              Manutenção Necessária
              {alerts.maintenance.length > 0 && (
                <Badge variant="outline" className="ml-auto text-destructive border-destructive/50">
                  {alerts.maintenance.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.maintenance.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum equipamento</p>
            ) : (
              alerts.maintenance.slice(0, 5).map((eq) => (
                <div
                  key={eq.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-destructive/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{eq.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{eq.name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs text-destructive border-destructive/50">
                    {getConditionLabel(eq.condition)}
                  </Badge>
                </div>
              ))
            )}
            {alerts.maintenance.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver mais {alerts.maintenance.length - 5}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Idle Equipment Alerts */}
        <Card className={cn(
          "border-border/50",
          alerts.idle.length > 0 && "border-blue-500/30"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Equipamentos Ociosos
              {alerts.idle.length > 0 && (
                <Badge variant="outline" className="ml-auto text-blue-500 border-blue-500/50">
                  {alerts.idle.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.idle.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum equipamento</p>
            ) : (
              alerts.idle.slice(0, 5).map((eq) => (
                <div
                  key={eq.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{eq.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{eq.name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/50">
                    {eq.daysSinceUpdate}d ocioso
                  </Badge>
                </div>
              ))
            )}
            {alerts.idle.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver mais {alerts.idle.length - 5}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EquipmentAlerts;
