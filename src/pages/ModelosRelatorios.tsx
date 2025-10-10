import { useState } from "react";
import Header from "@/components/Header";
import { FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentList } from "@/components/DocumentList";

const ModelosRelatorios = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Check-Lists
          </h1>
          <p className="text-muted-foreground">
            Upload e download de modelos de check-lists para inspeções e procedimentos
          </p>
        </div>

        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="documents">Modelos Disponíveis</TabsTrigger>
            <TabsTrigger value="upload">Upload de Modelo</TabsTrigger>
          </TabsList>

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
