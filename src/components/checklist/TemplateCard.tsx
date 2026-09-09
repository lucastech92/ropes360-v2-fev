import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, Copy, Archive, FolderOpen } from "lucide-react";
import { Checklist } from "@/hooks/useChecklistData";

interface TemplateCardProps {
  template: Checklist;
  onEdit: (template: Checklist) => void;
  onClone: (template: Checklist) => void;
}

export const TemplateCard = ({ template, onEdit, onClone }: TemplateCardProps) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{template.name}</span>
            <Badge variant="outline" className={
              template.checklist_type === 'entrada' 
                ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            }>
              {template.checklist_type === 'entrada' ? 'Entrada' : 'Saída'}
            </Badge>
            {template.is_template ? (
              <Badge variant="secondary">Modelo</Badge>
            ) : template.is_saved ? (
              <Badge variant="outline" className="gap-1">
                <Archive className="h-3 w-3" />
                Arquivado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <FolderOpen className="h-3 w-3" />
                Em uso
              </Badge>
            )}
            {template.service_tag && (
              <Badge variant="outline" className="font-mono text-xs">{template.service_tag}</Badge>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(template)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
        <Button
          size="sm"
          onClick={() => onClone(template)}
        >
          <Copy className="h-4 w-4 mr-1" />
          Reutilizar
        </Button>
      </div>
    </div>
  );
};
