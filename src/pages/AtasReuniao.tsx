import { useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, ClipboardList, ListChecks, Pencil, Plus, Trash2, UserCheck, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getDateLocale } from "@/utils/dateLocale";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getInitials, isOverdue, useMeetingMinutes } from "@/hooks/useMeetingMinutes";
import type { MeetingMinute } from "@/hooks/useMeetingMinutes";
import { MinuteFormDialog } from "@/components/meetings/MinuteFormDialog";
import { MeetingProjectsGrid } from "@/components/meetings/MeetingProjectsGrid";
import { ActionItemsTable } from "@/components/meetings/ActionItemsTable";

const AtasReuniao = () => {
  const {
    minutes,
    projects,
    actionItems,
    profiles,
    isLoading,
    createMinute,
    updateMinute,
    deleteMinute,
    saveProject,
    deleteProject,
    saveActionItem,
    toggleActionItem,
    deleteActionItem,
  } = useMeetingMinutes();
  const { canEdit, canDelete } = useUserRole();

  const { data: currentUserId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: 10 * 60 * 1000,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMinute, setEditingMinute] = useState<MeetingMinute | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MeetingMinute | null>(null);

  const projectNames = useMemo(
    () => Array.from(new Set(projects.map((p) => p.title))).sort(),
    [projects],
  );

  const filteredMinutes = useMemo(() => {
    return minutes.filter((m) => {
      if (dateFilter && m.meeting_date !== dateFilter) return false;
      if (projectFilter !== "all") {
        const has = projects.some((p) => p.minute_id === m.id && p.title === projectFilter);
        if (!has) return false;
      }
      if (onlyMine && currentUserId) {
        const mine = actionItems.some((a) => a.minute_id === m.id && a.assignee_id === currentUserId);
        if (!mine) return false;
      }
      return true;
    });
  }, [minutes, projects, actionItems, dateFilter, projectFilter, onlyMine, currentUserId]);

  const selected =
    filteredMinutes.find((m) => m.id === selectedId) ?? filteredMinutes[0] ?? null;

  const selectedProjects = projects.filter((p) => p.minute_id === selected?.id);
  const selectedActions = actionItems.filter((a) => a.minute_id === selected?.id);

  const profileLabel = (id: string) => {
    const p = profiles.find((x) => x.user_id === id);
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  const summaryLines = (selected?.summary ?? "")
    .split("\n")
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);

  const fmt = (date: string) =>
    format(new Date(`${date}T00:00:00`), "dd MMM yyyy", { locale: getDateLocale() });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container min-w-0 space-y-6 overflow-x-clip px-4 py-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Atas de Reuniões</h1>
              <p className="text-sm text-muted-foreground">
                Acompanhamento tático das reuniões semanais: decisões, projetos e responsabilidades.
              </p>
            </div>
          </div>
          {canEdit && (
            <Button
              className="gap-2"
              onClick={() => {
                setEditingMinute(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nova Ata
            </Button>
          )}
        </div>

        {/* Filtros rápidos */}
        <Card className="border-border/60">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="filter-date" className="text-xs font-medium text-muted-foreground">
                Busca por data
              </label>
              <Input id="filter-date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </div>
            <div className="flex-1 space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Filtrar por projeto</span>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projectNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-muted-foreground">Responsabilidades</span>
              <Toggle pressed={onlyMine} onPressedChange={setOnlyMine} variant="outline" className="gap-2">
                <UserCheck className="h-4 w-4" />
                Minhas responsabilidades
              </Toggle>
            </div>
            {(dateFilter || projectFilter !== "all" || onlyMine) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDateFilter("");
                  setProjectFilter("all");
                  setOnlyMine(false);
                }}
              >
                Limpar
              </Button>
            )}
          </CardContent>
        </Card>

        {filteredMinutes.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={minutes.length === 0 ? "Nenhuma ata registrada" : "Nenhuma ata encontrada"}
            description={
              minutes.length === 0
                ? "Crie a primeira ata para registrar tópicos, projetos e responsabilidades da reunião semanal."
                : "Ajuste os filtros de data, projeto ou responsabilidades para ver outras atas."
            }
            actionLabel={minutes.length === 0 && canEdit ? "Nova Ata" : undefined}
            onAction={() => {
              setEditingMinute(null);
              setFormOpen(true);
            }}
          />
        ) : (
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
            {/* Lista de atas */}
            <Card className="min-w-0 border-border/60 lg:sticky lg:top-20 lg:self-start">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Atas ({filteredMinutes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex snap-x gap-2 overflow-x-auto pb-4 lg:block lg:max-h-[60vh] lg:space-y-2 lg:overflow-x-hidden lg:overflow-y-auto">
                {filteredMinutes.map((m) => {
                  const late = actionItems.filter((a) => a.minute_id === m.id).filter(isOverdue).length;
                  const active = selected?.id === m.id;
                  return (
                    <Button
                      key={m.id}
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedId(m.id)}
                      className={cn(
                        "h-auto w-[min(78vw,260px)] shrink-0 snap-start items-start justify-start whitespace-normal rounded-lg border p-3 text-left transition-colors hover:border-primary/40 lg:w-full",
                        active && "border-primary bg-primary/5",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{fmt(m.meeting_date)}</p>
                        <p className="line-clamp-2 break-words text-sm font-medium">{m.title}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {actionItems.filter((a) => a.minute_id === m.id).length} ações
                          </Badge>
                          {late > 0 && (
                            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive">
                              {late} atrasada{late > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Detalhes da ata */}
            {selected && (
              <div className="min-w-0 space-y-6">
                <Card className="border-border/60">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                       <div className="min-w-0 space-y-1">
                        <Badge variant="outline" className="gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {fmt(selected.meeting_date)}
                        </Badge>
                         <h2 className="break-words text-xl font-bold md:text-2xl">{selected.title}</h2>
                      </div>
                      <div className="flex gap-1">
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                              setEditingMinute(selected);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(selected)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        Participantes ({selected.participants.length})
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {selected.participants.length === 0 && (
                          <span className="text-sm text-muted-foreground">Nenhum participante registrado.</span>
                        )}
                        {selected.participants.map((id) => (
                          <div key={id} className="flex items-center gap-2 rounded-full border bg-muted/40 py-1 pl-1 pr-3">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(profileLabel(id)) || "?"}
                              </AvatarFallback>
                            </Avatar>
                             <span className="max-w-[15rem] truncate text-xs">{profileLabel(id)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bloco 1 — Tópicos principais */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ListChecks className="h-4 w-4 text-primary" />
                      Tópicos principais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summaryLines.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">Nenhum tópico registrado.</p>
                    ) : (
                      <ul className="space-y-2">
                        {summaryLines.map((line, i) => (
                          <li key={i} className="flex gap-2 text-sm leading-relaxed">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* Bloco 2 — Projetos */}
                <MeetingProjectsGrid
                  projects={selectedProjects}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onSave={(values) => saveProject.mutate({ ...values, minute_id: selected.id })}
                  onDelete={(id) => deleteProject.mutate(id)}
                />

                {/* Bloco 3 — Ações */}
                <ActionItemsTable
                  items={selectedActions}
                  projects={selectedProjects}
                  profiles={profiles}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onSave={(values) => saveActionItem.mutate({ ...values, minute_id: selected.id })}
                  onToggle={(id, done) => toggleActionItem.mutate({ id, done })}
                  onDelete={(id) => deleteActionItem.mutate(id)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <MinuteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        profiles={profiles}
        minute={editingMinute}
        isSaving={createMinute.isPending || updateMinute.isPending}
        onSubmit={(values) => {
          if (editingMinute) {
            updateMinute.mutate({ id: editingMinute.id, ...values });
          } else {
            createMinute.mutate(values, { onSuccess: (data) => setSelectedId(data.id) });
          }
          setFormOpen(false);
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta ata?</AlertDialogTitle>
            <AlertDialogDescription>
              Os projetos e ações vinculados a “{deleteTarget?.title}” também serão removidos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMinute.mutate(deleteTarget.id);
                setSelectedId(null);
                setDeleteTarget(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AtasReuniao;
