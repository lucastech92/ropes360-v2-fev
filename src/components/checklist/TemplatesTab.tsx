import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";
import { Checklist } from "@/hooks/useChecklistData";
import { TemplateCard } from "./TemplateCard";

interface TemplatesTabProps {
  templates: Checklist[];
  onCreateClick: () => void;
  onEditClick: (template: Checklist) => void;
  onCloneClick: (template: Checklist) => void;
}

export const TemplatesTab = ({
  templates,
  onCreateClick,
  onEditClick,
  onCloneClick,
}: TemplatesTabProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates de Checklist
            </CardTitle>
            <CardDescription>
              Modelos base que podem ser clonados para novos serviços
            </CardDescription>
          </div>
          <Button onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum template criado ainda</p>
            <p className="text-sm">Crie um template para reutilizar em múltiplos serviços</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => onEditClick(template)}
                onClone={() => onCloneClick(template)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
