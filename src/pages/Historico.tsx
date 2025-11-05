import Header from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, ClipboardList, Package, Settings, Wrench, Clock } from "lucide-react";

type ActivityLog = {
  id: string;
  action: string;
  module: string;
  entity_type: string;
  description: string;
  created_at: string;
};

const Historico = () => {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-log"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  const getModuleIcon = (module: string) => {
    switch (module) {
      case "documents":
        return FileText;
      case "checklist":
        return ClipboardList;
      case "inventory":
        return Package;
      case "maintenance":
        return Settings;
      default:
        return Wrench;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "created":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "updated":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "deleted":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "completed":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "created":
        return "Criado";
      case "updated":
        return "Atualizado";
      case "deleted":
        return "Deletado";
      case "completed":
        return "Concluído";
      default:
        return action;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Histórico e Acompanhamento</h1>
          <p className="text-muted-foreground">
            Visualize todas as suas atividades e acompanhe o histórico de ações realizadas
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Linha do Tempo</CardTitle>
            </div>
            <CardDescription>
              Histórico completo de atividades realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Carregando histórico...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Nenhuma atividade registrada ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = getModuleIcon(activity.module);
                    return (
                      <div
                        key={activity.id}
                        className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="font-medium leading-none">
                                {activity.description}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {activity.entity_type} • {activity.module}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={getActionColor(activity.action)}
                            >
                              {getActionLabel(activity.action)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(activity.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Historico;
