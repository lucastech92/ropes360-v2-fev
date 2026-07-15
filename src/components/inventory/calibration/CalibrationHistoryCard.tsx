import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Calendar, CheckCircle } from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalibrationHistoryCardProps {
  lastCalibration: string | null;
  nextCalibration: string | null;
  calibrationInterval: number | null;
}

export function CalibrationHistoryCard({
  lastCalibration,
  nextCalibration,
  calibrationInterval,
}: CalibrationHistoryCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const getIntervalText = () => {
    if (calibrationInterval) {
      return `${calibrationInterval} ${calibrationInterval === 1 ? "mês" : "meses"}`;
    }
    return "Não definido";
  };

  const getCalibrationStatus = () => {
    if (!nextCalibration) return null;
    
    const today = new Date();
    const nextDate = new Date(nextCalibration);
    const monthsDiff = differenceInMonths(nextDate, today);
    
    if (monthsDiff < 0) {
      return { label: "Vencida", variant: "destructive" as const };
    } else if (monthsDiff <= 1) {
      return { label: "Urgente", variant: "destructive" as const };
    } else if (monthsDiff <= 3) {
      return { label: "Atenção", variant: "secondary" as const };
    }
    return { label: "Em dia", variant: "default" as const };
  };

  const status = getCalibrationStatus();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico de Calibração
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5" />
              Última Calibração
            </span>
            <span className="text-sm font-medium">
              {formatDate(lastCalibration)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Próxima Calibração
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {formatDate(nextCalibration)}
              </span>
              {status && (
                <Badge variant={status.variant} className="text-xs">
                  {status.label}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              Intervalo Configurado
            </span>
            <span className="text-sm font-medium">
              {getIntervalText()}
            </span>
          </div>
        </div>

        {!lastCalibration && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Nenhuma calibração registrada para este equipamento.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

