import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Download, Trash2, FileText, Calendar, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/utils/activityLogger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string | null;
  expiry_date: string | null;
  tags?: { id: string; name: string }[];
}

interface DocumentListWithTagsProps {
  folderId: string | null;
  category?: string;
  refreshTrigger?: number;
}

export const DocumentListWithTags = ({
  folderId,
  category,
  refreshTrigger,
}: DocumentListWithTagsProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [folderId, category, refreshTrigger]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase.from("documents").select("*");

      if (folderId) {
        query = query.eq("folder_id", folderId);
      } else if (folderId === null && category) {
        query = query.is("folder_id", null);
      }

      if (category) {
        query = query.eq("category", category as any);
      }

      const { data: docs, error } = await query.order("uploaded_at", { ascending: false });

      if (error) throw error;

      // Fetch tags for each document
      const docsWithTags = await Promise.all(
        (docs || []).map(async (doc) => {
          const { data: tagData } = await supabase
            .from("document_tags")
            .select(`
              tag_id,
              tags (id, name)
            `)
            .eq("document_id", doc.id);

          const tags = tagData?.map((t: any) => t.tags).filter(Boolean) || [];
          return { ...doc, tags };
        })
      );

      setDocuments(docsWithTags);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar documentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(filePath);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Log activity
      await logActivity({
        action: "downloaded",
        module: "documents",
        entityType: "document",
        description: `Download do documento "${fileName}"`,
        metadata: { file_name: fileName, file_path: filePath },
      });

      toast({
        title: "Download iniciado",
        description: `Baixando ${fileName}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro no download",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, filePath: string, title: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      // Log activity
      await logActivity({
        action: "deleted",
        module: "documents",
        entityType: "document",
        entityId: id,
        description: `Exclusão do documento "${title}"`,
        metadata: { title, file_path: filePath },
      });

      toast({
        title: "Documento deletado",
        description: `"${title}" foi removido com sucesso`,
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Tamanho desconhecido";
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Nenhum documento encontrado"
        description="Esta pasta ainda não contém documentos. Faça o upload do primeiro documento para começar."
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {documents.map((doc, index) => (
        <div
          key={doc.id}
          className="border rounded-lg p-4 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 hover:border-primary/20 animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{doc.title}</h3>
              {doc.description && (
                <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {doc.tags && doc.tags.length > 0 && (
                  <>
                    {doc.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>{doc.file_name}</span>
                <span>{formatFileSize(doc.file_size)}</span>
                {doc.expiry_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Validade: {formatDate(doc.expiry_date)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(doc.file_path, doc.file_name)}
                className="transition-all hover:scale-105 active:scale-95"
              >
                <Download className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deletar documento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja deletar "{doc.title}"? Esta ação não pode
                      ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(doc.id, doc.file_path, doc.title)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Deletar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};