import { useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentList } from "@/components/DocumentList";

const ProcedimentosOficiais = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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
            <CardTitle>Upload de Documentos</CardTitle>
            <CardDescription>
              Envie novos procedimentos, normas e documentos oficiais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUpload 
              category="procedimentos_oficiais" 
              onUploadComplete={() => setRefreshTrigger(prev => prev + 1)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos Disponíveis</CardTitle>
            <CardDescription>
              Baixe e gerencie os documentos da categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentList 
              category="procedimentos_oficiais" 
              refreshTrigger={refreshTrigger}
            />
          </CardContent>
        </Card>

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
