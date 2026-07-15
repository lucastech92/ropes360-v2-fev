import { useState } from "react";
import { CloudOff, Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineDocuments } from "@/hooks/useOfflineDocuments";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OfflineDocumentButtonProps {
  document: {
    id: string;
    title: string;
    description: string | null;
    file_name: string;
    file_path: string;
    file_size: number | null;
    file_type: string | null;
    category?: string;
  };
  size?: "sm" | "icon" | "default";
}

export const OfflineDocumentButton = ({
  document,
  size = "icon",
}: OfflineDocumentButtonProps) => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isDocumentOffline, saveDocumentOffline, removeDocumentOffline } =
    useOfflineDocuments();

  const isOffline = isDocumentOffline(document.id);

  const handleToggleOffline = async () => {
    setSaving(true);

    try {
      if (isOffline) {
        // Remove from offline storage
        const success = await removeDocumentOffline(document.id);
        if (success) {
          toast({
            title: "Removido do offline",
            description: `"${document.title}" foi removido dos downloads offline.`,
          });
        }
      } else {
        // Download and save to offline storage
        const { data: blob, error } = await supabase.storage
          .from("documents")
          .download(document.file_path);

        if (error) throw error;

        const success = await saveDocumentOffline(
          {
            id: document.id,
            title: document.title,
            description: document.description,
            file_name: document.file_name,
            file_path: document.file_path,
            file_size: document.file_size,
            file_type: document.file_type,
            category: document.category || "geral",
          },
          blob
        );

        if (success) {
          toast({
            title: "Salvo para offline",
            description: `"${document.title}" está disponível offline.`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isOffline ? "default" : "outline"}
          size={size}
          onClick={handleToggleOffline}
          disabled={saving}
          className={isOffline ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isOffline ? (
            <CloudOff className="h-4 w-4" />
          ) : (
            <Cloud className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isOffline ? "Remover do offline" : "Salvar para offline"}
      </TooltipContent>
    </Tooltip>
  );
};

