import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderKanban, Pencil, Plus, Target, Trash2 } from "lucide-react";
import type { MeetingProject, ProjectStatus } from "@/hooks/useMeetingMinutes";

export const projectStatusMeta: Record<ProjectStatus, { label: string; className: string }> = {
  planned: { label: "Planejado", className: "bg-muted text-muted-foreground border-border" },
  in_progress: {
    label: "Em andamento",
    className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
  delayed: {
    label: "Atrasado",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  completed: {
    label: "Concluído",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
};

interface Props {
  projects: MeetingProject[];
  canEdit: boolean;
  canDelete: boolean;
  onSave: (values: { id?: string; title: string; objective: string; status: ProjectStatus }) => void;
  onDelete: (id: string) => void;
}

export const MeetingProjectsGrid = ({ projects, canEdit, canDelete, onSave, onDelete }: Props) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingProject | null>(null);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("in_progress");

  const start = (project: MeetingProject | null) => {
    setEditing(project);
    setTitle(project?.title ?? "");
    setObjective(project?.objective ?? "");
    setStatus(project?.status ?? "in_progress");
    setOpen(true);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderKanban className="h-4 w-4 text-primary" />
          Projetos e objetivos
          <Badge variant="secondary">{projects.length}</Badge>
        </CardTitle>
        {canEdit && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => start(null)}>
            <Plus className="h-4 w-4" />
            Projeto
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum projeto registrado nesta ata.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const meta = projectStatusMeta[project.status];
              return (
                <div
                  key={project.id}
                  className="group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold leading-tight">{project.title}</h4>
                    <Badge variant="outline" className={meta.className}>
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {project.objective || "Sem objetivo descrito"}
                  </p>
                  {(canEdit || canDelete) && (
                    <div className="mt-auto flex gap-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {canEdit && (
                        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => start(project)}>
                          <Pencil className="h-3 w-3" />
                          Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => onDelete(project.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar projeto" : "Novo projeto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-title">Projeto</Label>
              <Input id="project-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: JBR 4521 — Petrobras" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-objective">Objetivo</Label>
              <Textarea id="project-objective" rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(projectStatusMeta) as ProjectStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {projectStatusMeta[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!title.trim()}
              onClick={() => {
                onSave({ id: editing?.id, title: title.trim(), objective, status });
                setOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
