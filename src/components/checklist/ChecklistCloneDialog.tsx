import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checklist } from "@/hooks/useChecklistData";

interface ChecklistCloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Checklist | null;
  serviceTag: string;
  name: string;
  onServiceTagChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
}

export const ChecklistCloneDialog = ({
  open,
  onOpenChange,
  template,
  serviceTag,
  name,
  onServiceTagChange,
  onNameChange,
  onSubmit,
}: ChecklistCloneDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clonar Template para Serviço</DialogTitle>
          <DialogDescription>
            Crie um novo checklist baseado no template "{template?.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="clone-name">Nome do Checklist</Label>
            <Input
              id="clone-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Manter nome do template ou alterar"
            />
          </div>
          <div>
            <Label htmlFor="clone-service-tag">Código JBR / Tag de Serviço*</Label>
            <Input
              id="clone-service-tag"
              value={serviceTag}
              onChange={(e) => onServiceTagChange(e.target.value)}
              placeholder="Ex: JBR-2024-001"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit}>Criar Checklist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
