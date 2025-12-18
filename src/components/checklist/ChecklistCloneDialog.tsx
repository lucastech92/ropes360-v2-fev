import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
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
  onClone: (serviceTag: string, name?: string) => Promise<void>;
}

export const ChecklistCloneDialog = ({
  open,
  onOpenChange,
  template,
  onClone,
}: ChecklistCloneDialogProps) => {
  const [serviceTag, setServiceTag] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setServiceTag("");
    }
  }, [template]);

  const handleSubmit = async () => {
    await onClone(serviceTag, name || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clonar Template para Serviço
          </DialogTitle>
          <DialogDescription>
            Crie um novo checklist baseado no template "{template?.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="clone-service-tag">Código JBR do Serviço*</Label>
            <Input
              id="clone-service-tag"
              value={serviceTag}
              onChange={(e) => setServiceTag(e.target.value)}
              placeholder="Ex: JBR-2024-001"
            />
          </div>
          <div>
            <Label htmlFor="clone-name">Nome do Checklist</Label>
            <Input
              id="clone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome opcional (usa o nome do template se vazio)"
            />
          </div>
          {template && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Template selecionado:</p>
              <p>• Tipo: {template.checklist_type === 'entrada' ? 'Entrada' : 'Saída'}</p>
              {template.description && <p>• {template.description}</p>}
              <p className="text-muted-foreground mt-2">
                Todos os itens do template serão copiados com quantidades zeradas.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            <Copy className="h-4 w-4 mr-2" />
            Clonar Checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
