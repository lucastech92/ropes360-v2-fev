import { Button } from "@/components/ui/button";
import { Edit, Plus } from "lucide-react";
import { Checklist } from "@/hooks/useChecklistData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props { checklists: Checklist[]; selectedChecklist: string | null; onSelectChecklist: (id: string) => void; onCreateClick: () => void; onEditClick: () => void; }

export const ChecklistSelector = ({ checklists, selectedChecklist, onSelectChecklist, onCreateClick, onEditClick }: Props) => <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
  <div className="min-w-0 flex-1"><p className="mb-1 text-xs font-medium text-muted-foreground">Checklist em exibição</p><Select value={selectedChecklist || undefined} onValueChange={onSelectChecklist}><SelectTrigger><SelectValue placeholder={checklists.length ? "Selecione um checklist" : "Nenhum checklist ativo"} /></SelectTrigger><SelectContent>{checklists.map(checklist => <SelectItem key={checklist.id} value={checklist.id}>{checklist.name}{checklist.service_tag ? ` · ${checklist.service_tag}` : ""} · {checklist.checklist_type === "entrada" ? "Entrada" : "Saída"}</SelectItem>)}</SelectContent></Select></div>
  <div className="flex gap-2 sm:pt-5">{selectedChecklist && <Button variant="outline" size="sm" onClick={onEditClick}><Edit className="mr-2 h-4 w-4" />Editar</Button>}<Button size="sm" onClick={onCreateClick}><Plus className="mr-2 h-4 w-4" />Novo checklist</Button></div>
</div>;
