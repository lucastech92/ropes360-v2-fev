import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PackagePlus, PackageMinus } from "lucide-react";
import { ServiceLinkSelect } from "@/components/service/ServiceLinkSelect";
import { ContainerLinkSelect } from "@/components/service/ContainerLinkSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChecklistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  isTemplate: boolean;
  name: string;
  description: string;
  serviceTag: string;
  type: 'entrada' | 'saida';
  selectedServiceId: string | null;
  selectedContainerId: string | null;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onServiceTagChange: (value: string) => void;
  onTypeChange: (value: 'entrada' | 'saida') => void;
  onIsTemplateChange: (value: boolean) => void;
  onServiceIdChange: (value: string | null) => void;
  onContainerIdChange: (value: string | null) => void;
  onSubmit: () => void;
}

export const ChecklistFormDialog = ({
  open,
  onOpenChange,
  mode,
  isTemplate,
  name,
  description,
  serviceTag,
  type,
  selectedServiceId,
  selectedContainerId,
  onNameChange,
  onDescriptionChange,
  onServiceTagChange,
  onTypeChange,
  onIsTemplateChange,
  onServiceIdChange,
  onContainerIdChange,
  onSubmit,
}: ChecklistFormDialogProps) => {
  const isCreate = mode === 'create';
  const title = isTemplate 
    ? (isCreate ? "Criar Novo Template" : "Editar Template")
    : (isCreate ? "Criar Novo Checklist" : "Editar Checklist");
  const description_ = isTemplate
    ? "Crie um modelo base com itens padrão para clonar em novos serviços"
    : "Crie um novo checklist para um serviço específico";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description_}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome{isTemplate ? " do Template" : ""}*</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={isTemplate ? "Ex: Montagem de Container" : "Nome do checklist"}
            />
          </div>
          <div>
            <Label htmlFor="type">Tipo*</Label>
            <Select value={type} onValueChange={onTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">
                  <div className="flex items-center gap-2">
                    <PackagePlus className="h-4 w-4" />
                    {isTemplate ? "Entrada (adiciona ao estoque)" : "Checklist de Entrada (adiciona ao estoque)"}
                  </div>
                </SelectItem>
                <SelectItem value="saida">
                  <div className="flex items-center gap-2">
                    <PackageMinus className="h-4 w-4" />
                    {isTemplate ? "Saída (retira do estoque)" : "Checklist de Saída (retira do estoque)"}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={isTemplate ? "Descrição do template" : "Descrição opcional"}
            />
          </div>
          {!isTemplate && (
            <>
              <ServiceLinkSelect
                selectedServiceId={selectedServiceId}
                onChange={(id) => {
                  onServiceIdChange(id);
                  onContainerIdChange(null);
                }}
                onServiceSelected={(service) => {
                  if (service) {
                    onServiceTagChange(service.codigo_jbr);
                  }
                }}
              />
              <ContainerLinkSelect selectedServiceId={selectedServiceId} selectedContainerId={selectedContainerId} onChange={onContainerIdChange} />
            </>
          )}
          {isCreate && !isTemplate && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_template"
                checked={isTemplate}
                onCheckedChange={(checked) => onIsTemplateChange(checked as boolean)}
              />
              <Label htmlFor="is_template" className="text-sm">
                Salvar como template (modelo reutilizável)
              </Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onSubmit}>
            {isCreate ? (isTemplate ? "Criar Template" : "Criar Checklist") : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
