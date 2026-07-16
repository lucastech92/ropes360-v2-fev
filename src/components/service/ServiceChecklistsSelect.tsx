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
  service_checklists?: { service_id: string }[];
}

interface ServiceChecklistsSelectProps {
  selectedChecklistIds: string[];
  onChange: (checklistIds: string[]) => void;
  mode: 'templates' | 'available' | 'all';
  disabledChecklistIds?: string[];
  disabledChecklistNames?: string[];
}

export const ServiceChecklistsSelect = ({
  selectedChecklistIds,
  onChange,
  mode = 'templates',
  disabledChecklistIds = [],
  disabledChecklistNames = [],
}: ServiceChecklistsSelectProps) => {
  const [checklists, setChecklists] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchChecklists();
  }, [mode]);

  const fetchChecklists = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      let query = supabase
        .from("checklists")
        .select("id, name, description, checklist_type, is_template, service_checklists!service_checklists_checklist_id_fkey(service_id)")
        .order("name");

      if (mode === 'templates') {
        query = query.eq("is_template", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching checklists:", error);
        setChecklists([]);
        setLoadError("Não foi possível carregar os checklists. Tente novamente.");
        return;
      }

      const loaded = (data ?? []) as ChecklistTemplate[];
      setChecklists(mode === 'available'
        ? loaded.filter((checklist) => checklist.is_template || !checklist.service_checklists?.length)
        : loaded);
    } catch (error) {
      console.error("Error fetching checklists:", error);
      setChecklists([]);
      setLoadError("Não foi possível carregar os checklists. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const isChecklistDisabled = (checklist: ChecklistTemplate) => {
    const normalizedName = checklist.name.trim().toLocaleLowerCase("pt-BR");
    return disabledChecklistIds.includes(checklist.id)
      || (checklist.is_template && disabledChecklistNames.includes(normalizedName));
  };

  const toggleChecklist = (checklist: ChecklistTemplate) => {
    if (isChecklistDisabled(checklist)) return;
    const checklistId = checklist.id;
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
          {mode === 'templates'
            ? 'Checklists (Templates para clonar)'
            : mode === 'available'
              ? 'Templates e checklists sem JBR'
              : 'Checklists'}
        </Label>
        {selectedChecklistIds.length > 0 && (
          <Badge variant="secondary">{selectedChecklistIds.length} selecionado(s)</Badge>
        )}
      </div>
      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : checklists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {mode === 'templates'
              ? 'Nenhum template disponível. Crie templates na página de Checklists.'
              : mode === 'available'
                ? 'Nenhum template ou checklist sem JBR disponível.'
                : 'Nenhum checklist disponível'}
          </p>
        ) : (
          checklists.map((checklist) => {
            const disabled = isChecklistDisabled(checklist);
            return <div
              key={checklist.id}
              className={`flex items-center space-x-2 rounded p-2 ${disabled ? "cursor-not-allowed bg-muted/30 opacity-60" : "cursor-pointer hover:bg-muted/50"}`}
              onClick={() => toggleChecklist(checklist)}
            >
              <Checkbox
                checked={selectedChecklistIds.includes(checklist.id)}
                disabled={disabled}
                onCheckedChange={() => toggleChecklist(checklist)}
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
                  {!checklist.is_template && mode === 'available' && (
                    <p className="text-xs text-muted-foreground">Checklist existente sem JBR</p>
                  )}
                  {checklist.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {checklist.description}
                    </p>
                  )}
                  {disabled && (
                    <p className="text-xs font-medium text-amber-600">Já adicionado a este JBR</p>
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
            </div>;
          })
        )}
      </div>
      {(mode === 'templates' || mode === 'available') && selectedChecklistIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Templates serão clonados; checklists existentes serão vinculados diretamente ao JBR.
        </p>
      )}
      {(disabledChecklistIds.length > 0 || disabledChecklistNames.length > 0) && (
        <p className="text-xs text-amber-600">Checklists já usados neste JBR ficam bloqueados para evitar cópias repetidas.</p>
      )}
    </div>
  );
};
