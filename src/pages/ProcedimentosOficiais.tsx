import { useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { FolderManager } from "@/components/FolderManager";
import { DocumentUploadWithTags } from "@/components/DocumentUploadWithTags";
import { DocumentListWithTags } from "@/components/DocumentListWithTags";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ProcedimentosOficiais = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);

  const handleFolderSelect = (folderId: string | null, folderName: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Procedimentos Oficiais
          </h1>
          <p className="text-muted-foreground">
            Acesse normas, procedimentos oficiais e documentação regulamentadora da empresa.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Pastas e Subpastas</CardTitle>
            <CardDescription>
              Organize os documentos em pastas e subpastas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FolderManager 
              category="procedimentos_oficiais" 
              onFolderSelect={handleFolderSelect}
              selectedFolderId={selectedFolderId}
            />
          </CardContent>
        </Card>

        {selectedFolderId && (
          <Card>
            <CardHeader>
              <CardTitle>Pasta: {selectedFolderName}</CardTitle>
              <CardDescription>
                Gerencie documentos e subpastas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="documents">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="documents">Documentos</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>
                
                <TabsContent value="documents" className="mt-6">
                  <DocumentListWithTags 
                    folderId={selectedFolderId}
                    category="procedimentos_oficiais"
                    refreshTrigger={refreshTrigger}
                  />
                </TabsContent>
                
                <TabsContent value="upload" className="mt-6">
                  <DocumentUploadWithTags 
                    folderId={selectedFolderId}
                    category="procedimentos_oficiais"
                    onUploadComplete={() => setRefreshTrigger(prev => prev + 1)}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <Card className="border-accent bg-accent/5">
          <CardHeader>
            <CardTitle className="text-xl">Importante</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Todos os documentos aqui disponíveis são de uso interno e não devem ser compartilhados externamente.
              Certifique-se de estar sempre utilizando a versão mais recente dos procedimentos.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProcedimentosOficiais;