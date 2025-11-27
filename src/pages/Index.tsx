import { useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { HomeSearch } from "@/components/HomeSearch";
import { FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderManager } from "@/components/FolderManager";
import { DocumentUploadWithTags } from "@/components/DocumentUploadWithTags";
import { DocumentListWithTags } from "@/components/DocumentListWithTags";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
const Index = () => {
  const { t } = useTranslation();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFolderSelect = (folderId: string | null, folderName: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        <div className="mb-8 space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">
            Centro de Inteligência - Ropes 360      
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Portal completo de conhecimento técnico para inspetores de campo da Bridon Bekaert.
          </p>
          
          <HomeSearch />
        </div>

        <DashboardMetrics />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-6 w-6" />
              <CardTitle>Minhas Pastas</CardTitle>
            </div>
            <CardDescription>
              Crie e gerencie suas próprias pastas e documentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FolderManager category="home" onFolderSelect={handleFolderSelect} selectedFolderId={selectedFolderId} />
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
                  <DocumentListWithTags folderId={selectedFolderId} category="home" refreshTrigger={refreshTrigger} />
                </TabsContent>
                
                <TabsContent value="upload" className="mt-6">
                  <DocumentUploadWithTags folderId={selectedFolderId} category="home" onUploadComplete={() => setRefreshTrigger(prev => prev + 1)} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <div className="mt-12 rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Precisa de ajuda? Entre em contato com a equipe técnica ou consulte a seção de{" "}
            <a href="/duvidas-frequentes" className="text-primary hover:underline">
              Dúvidas Frequentes
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;