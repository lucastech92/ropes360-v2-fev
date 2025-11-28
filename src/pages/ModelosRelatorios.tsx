import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { FileText, ClipboardList, FolderOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentList } from "@/components/DocumentList";

const ModelosRelatorios = () => {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Modelos e Relatórios
          </h1>
          <p className="text-muted-foreground">
            Upload e download de modelos de check-lists para inspeções e procedimentos
          </p>
        </div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="templates">Templates Digitais</TabsTrigger>
            <TabsTrigger value="documents">Modelos Disponíveis</TabsTrigger>
            <TabsTrigger value="upload">Upload de Modelo</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/wire-rope-inspection")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Inspeção de Cabo de Aço
                  </CardTitle>
                  <CardDescription>
                    Relatório de Inspeção Visual, Dimensional e Eletromagnética (MRT)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button className="w-full" onClick={(e) => { e.stopPropagation(); navigate("/wire-rope-inspection"); }}>
                      Criar Novo Relatório
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={(e) => { e.stopPropagation(); navigate("/saved-reports"); }}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Ver Relatórios Salvos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <DocumentList 
              category="modelos_relatorios" 
              refreshTrigger={refreshTrigger}
            />
          </TabsContent>

          <TabsContent value="upload">
            <DocumentUpload 
              category="modelos_relatorios"
              onUploadComplete={() => setRefreshTrigger(prev => prev + 1)}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ModelosRelatorios;
