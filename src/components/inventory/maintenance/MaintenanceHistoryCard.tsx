import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, CheckCircle, Clock, Wrench, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaintenanceHistoryItem {
  id: string;
  maintenance_type: string;
  status: string;
  scheduled_date: string;
  description: string;
  technician: string;
}

interface MaintenanceHistoryCardProps {
  inventoryItemId: string;
}

export default function MaintenanceHistoryCard({ inventoryItemId }: MaintenanceHistoryCardProps) {
  const [history, setHistory] = useState<MaintenanceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("maintenance_records")
        .select("id, maintenance_type, status, scheduled_date, description, technician")
        .eq("inventory_item_id", inventoryItemId)
        .order("scheduled_date", { ascending: false })
        .limit(3);

      if (!error && data) {
        setHistory(data);
      }
      setLoading(false);
    };

    if (inventoryItemId) {
      fetchHistory();
    }
  }, [inventoryItemId]);

  const getStatusIcon = (status: string) => {
    const config: Record<string, { icon: any; className: string }> = {
      pendente: { icon: Clock, className: "text-yellow-600" },
      em_andamento: { icon: Wrench, className: "text-blue-600" },
      concluida: { icon: CheckCircle, className: "text-green-600" },
      cancelada: { icon: AlertTriangle, className: "text-red-600" },
    };
    const { icon: Icon, className } = config[status] || config.pendente;
    return <Icon className={`h-4 w-4 ${className}`} />;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: "Pendente",
      em_andamento: "Em Andamento",
      concluida: "Concluída",
      cancelada: "Cancelada",
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      preventiva: "Preventiva",
      corretiva: "Corretiva",
      preditiva: "Preditiva",
      calibracao: "Calibração",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Últimas Manutenções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground animate-pulse">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Últimas Manutenções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Nenhuma manutenção anterior registrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          Últimas Manutenções
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((item) => (
          <div key={item.id} className="flex items-start gap-3 text-sm border-b last:border-0 pb-3 last:pb-0">
            {getStatusIcon(item.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  {format(new Date(item.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(item.maintenance_type)}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {getStatusLabel(item.status)}
                </span>
              </div>
              <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                {item.description}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Técnico: {item.technician}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
