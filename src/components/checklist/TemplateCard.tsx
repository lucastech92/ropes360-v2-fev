import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, Copy } from "lucide-react";
import { Checklist } from "@/hooks/useChecklistData";

interface TemplateCardProps {
  template: Checklist;
  onEdit: (template: Checklist) => void;
  onClone: (template: Checklist) => void;
}

export const TemplateCard = ({ template, onEdit, onClone }: TemplateCardProps) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{template.name}</span>
            <Badge variant="outline" className={
              template.checklist_type === 'entrada' 
                ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            }>
              {template.checklist_type === 'entrada' ? 'Entrada' : 'Saída'}
            </Badge>
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
          Clonar para Serviço
        </Button>
      </div>
    </div>
  );
};
