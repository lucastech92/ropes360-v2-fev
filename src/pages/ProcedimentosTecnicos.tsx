import { useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentList } from "@/components/DocumentList";
import { Wrench } from "lucide-react";

const ProcedimentosTecnicos = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const procedimentos = [{
    title: "Instalação de Cabos de Aço",
    description: "Procedimento passo a passo para instalação segura de cabos em diferentes aplicações.",
    topicos: ["Preparação do local e ferramentas", "Desenrolamento correto do cabo", "Técnicas de tensionamento", "Verificação final e documentação"]
  }, {
    title: "Soquetagem de Cabos",
    description: "Técnicas de soquetagem com resina ou metal fundido para fixação de terminais.",
    topicos: ["Preparação da alma do cabo", "Limpeza e desengraxe dos arames", "Aplicação de resina ou metal", "Tempo de cura e testes de qualidade"]
  }, {
    title: "Remoção e Descarte",
    description: "Procedimentos seguros para remoção de cabos condenados e descarte adequado.",
    topicos: ["Isolamento da área de trabalho", "Alívio de tensão controlado", "Corte e retirada segura", "Destinação para reciclagem"]
  }, {
    title: "Cálculo de Área Metálica",
    description: "Como calcular a área metálica do cabo para avaliação de integridade estrutural.",
    topicos: ["Medição precisa do diâmetro", "Fórmula para cálculo de área", "Interpretação dos resultados", "Comparação com valores nominais"]
  }];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold">Manuais Bridon</h1>
          <p className="text-muted-foreground">
            Instruções detalhadas para execução de trabalhos técnicos em campo.
          </p>
        </div>

        <Tabs defaultValue="content" className="space-y-6">
          <TabsList>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <div className="grid gap-6">
              {procedimentos.map((proc, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Wrench className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{proc.title}</CardTitle>
                    <CardDescription className="text-base">{proc.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <h4 className="mb-3 font-semibold">Principais Tópicos:</h4>
                    <ul className="space-y-2">
                      {proc.topicos?.map((topico, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="mt-1 flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                          <span className="text-muted-foreground">{topico}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-8 border-accent bg-accent/5">
              <CardHeader>
                <CardTitle className="text-xl">Dica de Segurança</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sempre utilize os EPIs adequados para cada procedimento e siga rigorosamente as normas de segurança.
                  Em caso de dúvida, consulte o supervisor ou a equipe técnica antes de prosseguir.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <DocumentList 
              category="procedimentos_tecnicos" 
              refreshTrigger={refreshTrigger}
            />
          </TabsContent>

          <TabsContent value="upload">
            <DocumentUpload 
              category="procedimentos_tecnicos"
              onUploadComplete={() => setRefreshTrigger(prev => prev + 1)}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProcedimentosTecnicos;
