import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, CheckSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getDateLocale } from "@/utils/dateLocale";
import { getInitials, isOverdue } from "@/hooks/useMeetingMinutes";
import type { ActionStatus, MeetingActionItem, MeetingProject, TeamProfile } from "@/hooks/useMeetingMinutes";

const statusMeta: Record<ActionStatus, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground border-border" },
  in_progress: { label: "Em andamento", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  completed: { label: "Concluída", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
};

interface Props {
  items: MeetingActionItem[];
  projects: MeetingProject[];
  profiles: TeamProfile[];
  canEdit: boolean;
  canDelete: boolean;
  onSave: (values: {
    id?: string;
    description: string;
    assignee_id: string | null;
    assignee_name: string | null;
    due_date: string | null;
    status: ActionStatus;
    project_id: string | null;
  }) => void;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}

export const ActionItemsTable = ({ items, projects, profiles, canEdit, canDelete, onSave, onToggle, onDelete }: Props) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingActionItem | null>(null);
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string>("none");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<ActionStatus>("pending");
  const [projectId, setProjectId] = useState<string>("none");

  const profileLabel = (id: string | null) => {
    if (!id) return null;
    const p = profiles.find((x) => x.user_id === id);
    return p?.full_name || p?.email || null;
  };

  const start = (item: MeetingActionItem | null) => {
    setEditing(item);
    setDescription(item?.description ?? "");
    setAssignee(item?.assignee_id ?? "none");
    setDueDate(item?.due_date ?? "");
    setStatus(item?.status ?? "pending");
    setProjectId(item?.project_id ?? "none");
    setOpen(true);
  };

  const overdueCount = items.filter(isOverdue).length;

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <CheckSquare className="h-4 w-4 text-primary" />
          Responsabilidades e ações
          <Badge variant="secondary">{items.length}</Badge>
          {overdueCount > 0 && (
            <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
        {canEdit && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => start(null)}>
            <Plus className="h-4 w-4" />
            Ação
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma ação registrada nesta ata.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Ação / Tarefa</TableHead>
                  <TableHead className="hidden md:table-cell">Responsável</TableHead>
                  <TableHead className="hidden sm:table-cell">Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const late = isOverdue(item);
                  const done = item.status === "completed";
                  const name = profileLabel(item.assignee_id) || item.assignee_name || "Não atribuído";
                  const project = projects.find((p) => p.id === item.project_id);
                  return (
                    <TableRow key={item.id} className={cn(late && "bg-destructive/5")}>
                      <TableCell>
                        <Checkbox
                          checked={done}
                          disabled={!canEdit}
                          aria-label="Concluir ação"
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={(v) => onToggle(item.id, v === true)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className={cn("font-medium", done && "text-muted-foreground line-through")}>
                          {item.description}
                        </div>
                        {project && (
                          <span className="text-xs text-muted-foreground">{project.title}</span>
                        )}
                        <div className="mt-1 flex items-center gap-2 md:hidden">
                          <span className="text-xs text-muted-foreground">{name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(name) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {item.due_date ? (
                          <span className={cn("flex items-center gap-1 text-sm", late && "font-medium text-destructive")}>
                            {late && <AlertTriangle className="h-3.5 w-3.5" />}
                            {format(new Date(`${item.due_date}T00:00:00`), "dd MMM yyyy", { locale: getDateLocale() })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusMeta[item.status].className}>
                          {statusMeta[item.status].label}
                        </Badge>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell>
                          <div className="flex gap-0.5">
                            {canEdit && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => start(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => onDelete(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar ação" : "Nova ação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="action-desc">Ação / Tarefa</Label>
              <Input id="action-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que deve ser feito" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name || p.email || p.user_id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-due">Prazo</Label>
                <Input id="action-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ActionStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(statusMeta) as ActionStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusMeta[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Projeto</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!description.trim()}
              onClick={() => {
                const assigneeId = assignee === "none" ? null : assignee;
                onSave({
                  id: editing?.id,
                  description: description.trim(),
                  assignee_id: assigneeId,
                  assignee_name: assigneeId ? profileLabel(assigneeId) : null,
                  due_date: dueDate || null,
                  status,
                  project_id: projectId === "none" ? null : projectId,
                });
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
