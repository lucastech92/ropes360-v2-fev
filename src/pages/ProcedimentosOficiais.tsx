import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const ProcedimentosOficiais = () => {
  const procedimentos = [
    {
      title: "ISO 4309 - Critérios de Descarte",
      description: "Norma internacional para critérios de inspeção e descarte de cabos de aço.",
      category: "Normas Internacionais"
    },
    {
      title: "Procedimento de Segurança em Campo",
      description: "Diretrizes de segurança para trabalhos em altura e manuseio de equipamentos.",
      category: "Segurança"
    },
    {
      title: "Manual de Qualidade BB",
      description: "Manual completo de qualidade e boas práticas da Bridon-Bekaert.",
      category: "Qualidade"
    },
    {
      title: "NR-35 - Trabalho em Altura",
      description: "Norma regulamentadora sobre trabalho em altura e uso de EPIs.",
      category: "Normas Regulamentadoras"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold">Procedimentos Oficiais</h1>
          <p className="text-muted-foreground">
            Acesse normas, procedimentos oficiais e documentação regulamentadora da empresa.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {procedimentos.map((proc, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {proc.category}
                  </span>
                </div>
                <CardTitle className="text-xl">{proc.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 text-base">
                  {proc.description}
                </CardDescription>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Documento
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-accent bg-accent/5">
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
