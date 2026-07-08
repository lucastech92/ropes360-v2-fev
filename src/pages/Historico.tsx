import Header from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, ClipboardList, Package, Settings, Wrench, Clock, Download, Upload, Trash2, Filter } from "lucide-react";
import { useState } from "react";
import { ListSkeleton } from "@/components/skeletons/AppSkeletons";

type ActivityLog = {
  id: string;
  action: string;
  module: string;
  entity_type: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any> | null;
};

const Historico = () => {
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

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
      case "folders":
        return FileText;
      case "tags":
        return FileText;
      default:
        return Wrench;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "uploaded":
        return Upload;
      case "downloaded":
        return Download;
      case "deleted":
        return Trash2;
      default:
        return Clock;
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
      case "uploaded":
        return "Upload";
      case "downloaded":
        return "Download";
      default:
        return action;
    }
  };

  const getModuleLabel = (module: string) => {
    switch (module) {
      case "documents":
        return "Documentos";
      case "checklist":
        return "Checklist";
      case "inventory":
        return "Inventário";
      case "maintenance":
        return "Manutenção";
      case "folders":
        return "Pastas";
      case "tags":
        return "Tags";
      default:
        return module;
    }
  };

  const filteredActivities = activities.filter((activity) => {
    if (filterModule !== "all" && activity.module !== filterModule) return false;
    if (filterAction !== "all" && activity.action !== filterAction) return false;
    return true;
  });

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <CardTitle>Linha do Tempo</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterModule} onValueChange={setFilterModule}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="documents">Documentos</SelectItem>
                    <SelectItem value="checklist">Checklist</SelectItem>
                    <SelectItem value="inventory">Inventário</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="folders">Pastas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="uploaded">Upload</SelectItem>
                    <SelectItem value="downloaded">Download</SelectItem>
                    <SelectItem value="deleted">Deletado</SelectItem>
                    <SelectItem value="created">Criado</SelectItem>
                    <SelectItem value="updated">Atualizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CardDescription>
              Histórico completo de atividades • {filteredActivities.length} registro(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {isLoading ? (
                <ListSkeleton rows={8} />
              ) : filteredActivities.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    {activities.length === 0 
                      ? "Nenhuma atividade registrada ainda" 
                      : "Nenhuma atividade encontrada com os filtros selecionados"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => {
                    const ModuleIcon = getModuleIcon(activity.module);
                    const ActionIcon = getActionIcon(activity.action);
                    return (
                      <div
                        key={activity.id}
                        className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0 flex flex-col gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <ModuleIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex h-6 w-10 items-center justify-center rounded bg-muted">
                            <ActionIcon className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <p className="font-medium leading-none">
                                {activity.description}
                              </p>
                              <div className="flex gap-2 items-center text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {getModuleLabel(activity.module)}
                                </Badge>
                                <span>•</span>
                                <span className="capitalize">{activity.entity_type}</span>
                              </div>
                              {activity.metadata && (
                                <div className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(activity.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={getActionColor(activity.action)}
                            >
                              {getActionLabel(activity.action)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(activity.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>
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
