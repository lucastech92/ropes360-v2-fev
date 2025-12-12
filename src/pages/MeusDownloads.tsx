import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
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
import {
  CloudOff,
  Download,
  Trash2,
  FileText,
  HardDrive,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOfflineDocuments, OfflineDocument } from "@/hooks/useOfflineDocuments";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const MeusDownloads = () => {
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const {
    offlineDocuments,
    loading,
    storageUsed,
    formatStorageSize,
    loadAllOfflineDocuments,
    removeDocumentOffline,
    getOfflineDocument,
    clearAllOfflineDocuments,
  } = useOfflineDocuments();

  const [documents, setDocuments] = useState<OfflineDocument[]>([]);

  useEffect(() => {
    loadAllOfflineDocuments().then(setDocuments);
  }, [loadAllOfflineDocuments]);

  const handleOpenDocument = async (id: string) => {
    const doc = await getOfflineDocument(id);
    if (doc) {
      const url = URL.createObjectURL(doc.blob);
      window.open(url, "_blank");
      // Cleanup after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  const handleDownloadDocument = async (id: string) => {
    const doc = await getOfflineDocument(id);
    if (doc) {
      const url = URL.createObjectURL(doc.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: `Baixando ${doc.file_name}`,
      });
    }
  };

  const handleRemoveDocument = async (id: string, title: string) => {
    const success = await removeDocumentOffline(id);
    if (success) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast({
        title: "Documento removido",
        description: `"${title}" foi removido do armazenamento offline.`,
      });
    }
  };

  const handleClearAll = async () => {
    const success = await clearAllOfflineDocuments();
    if (success) {
      setDocuments([]);
      toast({
        title: "Armazenamento limpo",
        description: "Todos os documentos offline foram removidos.",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">Meus Downloads</h1>
            <p className="text-muted-foreground">
              Documentos salvos para acesso offline
            </p>
          </div>
          {!isOnline && (
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
              <CloudOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>

        {/* Storage Info Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HardDrive className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Armazenamento Local</CardTitle>
                  <CardDescription>
                    {documents.length} documento{documents.length !== 1 ? "s" : ""} •{" "}
                    {formatStorageSize(storageUsed)} usado
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAllOfflineDocuments().then(setDocuments)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                {documents.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpar tudo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar armazenamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Todos os {documents.length} documentos salvos offline
                          serão removidos. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearAll}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Limpar tudo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Document List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando documentos offline...
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={CloudOff}
            title="Nenhum documento offline"
            description="Salve documentos para acessá-los mesmo sem conexão com a internet. Vá até um documento e clique no ícone de nuvem para salvá-lo."
          />
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOpenDocument(doc.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{doc.title}</h3>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span>{doc.file_name}</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>Salvo em {formatDate(doc.savedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="flex gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownloadDocument(doc.id)}
                        title="Baixar arquivo"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" title="Remover">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{doc.title}" será removido do armazenamento offline.
                              Você poderá baixá-lo novamente quando estiver online.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveDocument(doc.id, doc.title)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MeusDownloads;
