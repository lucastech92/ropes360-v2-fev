import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeetingMinute, TeamProfile } from "@/hooks/useMeetingMinutes";
import { getInitials } from "@/hooks/useMeetingMinutes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: TeamProfile[];
  minute?: MeetingMinute | null;
  isSaving?: boolean;
  onSubmit: (values: { meeting_date: string; title: string; summary: string; participants: string[] }) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const MinuteFormDialog = ({ open, onOpenChange, profiles, minute, isSaving, onSubmit }: Props) => {
  const [date, setDate] = useState(today());
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setDate(minute?.meeting_date ?? today());
    setTitle(minute?.title ?? "");
    setSummary(minute?.summary ?? "");
    setParticipants(minute?.participants ?? []);
  }, [open, minute]);

  const toggle = (id: string) =>
    setParticipants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const label = (p: TeamProfile) => p.full_name || p.email || p.user_id.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{minute ? "Editar ata" : "Nova ata de reunião"}</DialogTitle>
          <DialogDescription>
            Registre a data, os participantes e os tópicos principais discutidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="minute-date">Data da reunião</Label>
              <Input id="minute-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="minute-title">Título</Label>
              <Input
                id="minute-title"
                placeholder="Reunião semanal — Operação"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minute-summary">Tópicos principais</Label>
            <Textarea
              id="minute-summary"
              rows={7}
              placeholder={"• Ponto discutido\n• Decisão tomada\n• Risco identificado"}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use uma linha por tópico. Linhas iniciadas com “-” ou “•” aparecem como lista.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Participantes ({participants.length})</Label>
            <div className="flex flex-wrap gap-2 rounded-lg border p-3 max-h-44 overflow-y-auto">
              {profiles.length === 0 && (
                <span className="text-sm text-muted-foreground">Nenhum usuário disponível.</span>
              )}
              {profiles.map((p) => {
                const selected = participants.includes(p.user_id);
                return (
                  <Badge
                    key={p.user_id}
                    variant={selected ? "default" : "outline"}
                    onClick={() => toggle(p.user_id)}
                    className={cn("cursor-pointer gap-1 py-1", !selected && "hover:bg-muted")}
                  >
                    {selected && <Check className="h-3 w-3" />}
                    <span className="font-mono text-[10px] opacity-70">{getInitials(label(p))}</span>
                    {label(p)}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!title.trim() || isSaving}
            onClick={() => onSubmit({ meeting_date: date, title: title.trim(), summary, participants })}
          >
            {minute ? "Salvar alterações" : "Criar ata"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
