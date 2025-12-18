import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, FileText, Plus } from "lucide-react";
import { Checklist } from "@/hooks/useChecklistData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ChecklistSelectorProps {
  checklists: Checklist[];
  selectedChecklist: string | null;
  onSelectChecklist: (id: string) => void;
  onCreateClick: () => void;
  onEditClick: () => void;
}

export const ChecklistSelector = ({
  checklists,
  selectedChecklist,
  onSelectChecklist,
  onCreateClick,
  onEditClick,
}: ChecklistSelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Selecionar Checklist</CardTitle>
            <CardDescription>
              Escolha um checklist para visualizar e preencher
            </CardDescription>
          </div>
          <Button onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Checklist
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={selectedChecklist || undefined} onValueChange={onSelectChecklist}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um checklist" />
          </SelectTrigger>
          <SelectContent>
            {checklists.map((checklist) => (
              <SelectItem key={checklist.id} value={checklist.id}>
                <div className="flex items-center gap-2">
                  {checklist.is_template && <FileText className="h-4 w-4 text-primary" />}
                  <span>{checklist.name}</span>
                  {checklist.service_tag && <span className="text-muted-foreground">({checklist.service_tag})</span>}
                  <span className="text-muted-foreground">- {checklist.checklist_type === 'entrada' ? 'Entrada' : 'Saída'}</span>
                  {checklist.is_template && <Badge variant="secondary" className="text-xs">Template</Badge>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedChecklist && (
          <Button variant="outline" className="w-full" onClick={onEditClick}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Checklist Atual
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
