import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, FileText, PackagePlus, PackageMinus } from "lucide-react";

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  checklist_type: 'entrada' | 'saida';
  is_template: boolean;
}

interface ServiceChecklistsSelectProps {
  selectedChecklistIds: string[];
  onChange: (checklistIds: string[]) => void;
  mode: 'templates' | 'all';
}

export const ServiceChecklistsSelect = ({
  selectedChecklistIds,
  onChange,
  mode = 'templates',
}: ServiceChecklistsSelectProps) => {
  const [checklists, setChecklists] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChecklists();
  }, [mode]);

  const fetchChecklists = async () => {
    try {
      let query = supabase
        .from("checklists")
        .select("id, name, description, checklist_type, is_template")
        .order("name");

      if (mode === 'templates') {
        query = query.eq("is_template", true);
      }

      const { data, error } = await query;

      if (!error && data) {
        setChecklists(data as ChecklistTemplate[]);
      }
    } catch (error) {
      console.error("Error fetching checklists:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklist = (checklistId: string) => {
    if (selectedChecklistIds.includes(checklistId)) {
      onChange(selectedChecklistIds.filter((id) => id !== checklistId));
    } else {
      onChange([...selectedChecklistIds, checklistId]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Checklists (Templates)
        </Label>
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          {mode === 'templates' ? 'Checklists (Templates para clonar)' : 'Checklists'}
        </Label>
        {selectedChecklistIds.length > 0 && (
          <Badge variant="secondary">{selectedChecklistIds.length} selecionado(s)</Badge>
        )}
      </div>
      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
        {checklists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {mode === 'templates' 
              ? 'Nenhum template disponível. Crie templates na página de Checklists.' 
              : 'Nenhum checklist disponível'}
          </p>
        ) : (
          checklists.map((checklist) => (
            <div
              key={checklist.id}
              className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
              onClick={() => toggleChecklist(checklist.id)}
            >
              <Checkbox
                checked={selectedChecklistIds.includes(checklist.id)}
                onCheckedChange={() => toggleChecklist(checklist.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {checklist.is_template ? (
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <ClipboardList className="h-4 w-4 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{checklist.name}</p>
                  {checklist.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {checklist.description}
                    </p>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={`shrink-0 text-xs ${
                    checklist.checklist_type === 'entrada'
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                  }`}
                >
                  {checklist.checklist_type === 'entrada' ? (
                    <PackagePlus className="h-3 w-3 mr-1" />
                  ) : (
                    <PackageMinus className="h-3 w-3 mr-1" />
                  )}
                  {checklist.checklist_type === 'entrada' ? 'Entrada' : 'Saída'}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
      {mode === 'templates' && selectedChecklistIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Os templates selecionados serão clonados automaticamente com o código JBR do serviço
        </p>
      )}
    </div>
  );
};
