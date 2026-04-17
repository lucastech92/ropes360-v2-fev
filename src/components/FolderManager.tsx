import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, Plus, Trash2, FolderOpen, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
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

interface FolderType {
  id: string;
  name: string;
  parent_folder_id: string | null;
  category: string | null;
}

interface FolderManagerProps {
  category?: string;
  onFolderSelect?: (folderId: string | null, folderName: string | null) => void;
  selectedFolderId?: string | null;
}

export const FolderManager = ({ category, onFolderSelect, selectedFolderId }: FolderManagerProps) => {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Raiz" }
  ]);
  const { toast } = useToast();
  const { canDelete } = useUserRole();

  useEffect(() => {
    fetchFolders();
  }, [category, currentParentId]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("folders")
        .select("*")
        .order("name");
      
      if (currentParentId === null) {
        query = query.is("parent_folder_id", null);
      } else {
        query = query.eq("parent_folder_id", currentParentId);
      }

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFolders(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pastas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Nome inválido",
        description: "Digite um nome para a pasta",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("folders").insert({
        name: newFolderName,
        parent_folder_id: currentParentId,
        category: category || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Pasta criada",
        description: `A pasta "${newFolderName}" foi criada com sucesso`,
      });

      setNewFolderName("");
      fetchFolders();
    } catch (error: any) {
      toast({
        title: "Erro ao criar pasta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteFolder = async (folderId: string, folderName: string) => {
    try {
      const { error } = await supabase.from("folders").delete().eq("id", folderId);

      if (error) throw error;

      toast({
        title: "Pasta deletada",
        description: `A pasta "${folderName}" foi deletada`,
      });

      fetchFolders();
    } catch (error: any) {
      toast({
        title: "Erro ao deletar pasta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const navigateToFolder = async (folderId: string, folderName: string) => {
    setCurrentParentId(folderId);
    setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
    if (onFolderSelect) {
      onFolderSelect(folderId, folderName);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    const targetId = newBreadcrumbs[newBreadcrumbs.length - 1].id;
    setCurrentParentId(targetId);
    if (onFolderSelect) {
      const targetName = newBreadcrumbs[newBreadcrumbs.length - 1].name;
      onFolderSelect(targetId, targetId ? targetName : null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-muted-foreground">/</span>}
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className="text-primary hover:underline"
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Create new folder */}
      <div className="flex gap-2">
        <Input
          placeholder="Nome da nova pasta"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createFolder()}
        />
        <Button onClick={createFolder}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Pasta
        </Button>
      </div>

      {/* Folders list */}
      {loading ? (
        <p className="text-muted-foreground">Carregando pastas...</p>
      ) : folders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma pasta encontrada. Crie sua primeira pasta acima.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <Card key={folder.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigateToFolder(folder.id, folder.name)}
                    className="flex items-center gap-2 flex-1 text-left hover:text-primary"
                  >
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <span className="font-medium">{folder.name}</span>
                  </button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deletar pasta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja deletar a pasta "{folder.name}"? 
                          Todos os arquivos e subpastas serão removidos permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteFolder(folder.id, folder.name)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};