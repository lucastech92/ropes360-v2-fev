import { useState } from "react";
import Header from "@/components/Header";
import ModuleCard from "@/components/ModuleCard";
import { 
  FileCheck, 
  Wrench, 
  GraduationCap, 
  FileText, 
  AlertTriangle, 
  HelpCircle, 
  History,
  ClipboardList,
  Package,
  FolderOpen
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderManager } from "@/components/FolderManager";
import { DocumentUploadWithTags } from "@/components/DocumentUploadWithTags";
import { DocumentListWithTags } from "@/components/DocumentListWithTags";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const modules = [
    {
      title: "Procedimentos Oficiais",
      description: "Acesse todos os procedimentos e normas oficiais da empresa, incluindo ISO 4309 e diretrizes de segurança.",
      icon: FileCheck,
      href: "/procedimentos-oficiais",
      color: "primary"
    },
    {
      title: "Manuais Bridon",
      description: "Instruções detalhadas para instalação, soquetagem, remoção e manutenção de cabos de aço.",
      icon: Wrench,
      href: "/procedimentos-tecnicos",
      color: "primary"
    },
    {
      title: "Treinamento e Glossário",
      description: "Materiais de treinamento, glossário técnico e vídeos educativos para desenvolvimento contínuo.",
      icon: GraduationCap,
      href: "/treinamento",
      color: "primary"
    },
    {
      title: "Check List",
      description: "Checklists preenchíveis para montagem de containers e verificação de ferramentas (JBR).",
      icon: ClipboardList,
      href: "/checklist",
      color: "accent"
    },
    {
      title: "Modelos e Relatórios",
      description: "Upload e download de modelos de relatórios para inspeções e procedimentos.",
      icon: FileText,
      href: "/modelos-relatorios",
      color: "accent"
    },
    {
      title: "Resolução de Problemas",
      description: "Casos reais de falhas, análises de causa raiz e soluções aplicadas em campo.",
      icon: AlertTriangle,
      href: "/resolucao-problemas",
      color: "primary"
    },
    {
      title: "Documentação da Equipe",
      description: "Perguntas mais comuns dos inspetores e suas respostas, além de dicas práticas do dia a dia.",
      icon: HelpCircle,
      href: "/duvidas-frequentes",
      color: "primary"
    },
    {
      title: "Histórico e Acompanhamento",
      description: "Registros de inspeções anteriores, rastreabilidade e acompanhamento de manutenções.",
      icon: History,
      href: "/historico",
      color: "primary"
    },
    {
      title: "Inventário / Almoxarife",
      description: "Controle de itens e consumíveis disponíveis na base com alertas de estoque mínimo.",
      icon: Package,
      href: "/inventario",
      color: "accent"
    }
  ];

  const handleFolderSelect = (folderId: string | null, folderName: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        <div className="mb-12 space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Centro de Inteligência
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Portal completo de conhecimento técnico para inspetores de campo da Bridon-Bekaert.
            Acesse procedimentos, normas, treinamentos e ferramentas essenciais para suas atividades.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((module) => (
            <ModuleCard key={module.href} {...module} />
          ))}
        </div>

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
            <FolderManager 
              category="home"
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
                    category="home"
                    refreshTrigger={refreshTrigger}
                  />
                </TabsContent>
                
                <TabsContent value="upload" className="mt-6">
                  <DocumentUploadWithTags 
                    folderId={selectedFolderId}
                    category="home"
                    onUploadComplete={() => setRefreshTrigger(prev => prev + 1)}
                  />
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