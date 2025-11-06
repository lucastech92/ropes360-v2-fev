import { useEffect, useState } from "react";
import { FileText, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/utils/activityLogger";

type DocumentCategory = 
  | "procedimentos_oficiais"
  | "inspecoes"
  | "procedimentos_tecnicos"
  | "treinamento"
  | "modelos_relatorios"
  | "resolucao_problemas"
  | "duvidas_frequentes"
  | "historico";

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
}

interface DocumentListProps {
  category: DocumentCategory;
  employeeFolder?: string;
  refreshTrigger?: number;
}

export const DocumentList = ({ category, employeeFolder, refreshTrigger }: DocumentListProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    setLoading(true);
    let query = supabase
      .from("documents")
      .select("*")
      .eq("category", category);
    
    if (employeeFolder) {
      query = query.eq("employee_folder", employeeFolder);
    }
    
    const { data, error } = await query.order("uploaded_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos.",
        variant: "destructive",
      });
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [category, employeeFolder, refreshTrigger]);

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log activity
      await logActivity({
        action: "downloaded",
        module: "documents",
        entityType: "document",
        description: `Download do documento "${fileName}"`,
        metadata: { file_name: fileName, file_path: filePath, category },
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, filePath: string, fileName: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([filePath]);

    if (storageError) {
      toast({
        title: "Erro",
        description: "Erro ao excluir arquivo do storage.",
        variant: "destructive",
      });
      return;
    }

    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (dbError) {
      toast({
        title: "Erro",
        description: "Erro ao excluir registro do documento.",
        variant: "destructive",
      });
    } else {
      // Log activity
      await logActivity({
        action: "deleted",
        module: "documents",
        entityType: "document",
        entityId: id,
        description: `Exclusão do documento "${fileName}"`,
        metadata: { file_name: fileName, file_path: filePath, category },
      });

      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso.",
      });
      fetchDocuments();
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return <div className="text-muted-foreground">Carregando documentos...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhum documento disponível nesta categoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-card border border-border rounded-lg p-4 flex items-start justify-between hover:bg-accent/50 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-foreground">{doc.title}</h4>
                {doc.description && (
                  <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{doc.file_name}</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>{new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDownload(doc.file_path, doc.file_name)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDelete(doc.id, doc.file_path, doc.file_name)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
