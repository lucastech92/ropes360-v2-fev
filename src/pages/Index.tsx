import Header from "@/components/Header";
import ModuleCard from "@/components/ModuleCard";
import { 
  FileCheck, 
  Search, 
  Wrench, 
  GraduationCap, 
  FileText, 
  AlertTriangle, 
  HelpCircle, 
  History 
} from "lucide-react";

const Index = () => {
  const modules = [
    {
      title: "Procedimentos Oficiais",
      description: "Acesse todos os procedimentos e normas oficiais da empresa, incluindo ISO 4309 e diretrizes de segurança.",
      icon: FileCheck,
      href: "/procedimentos-oficiais",
      color: "primary"
    },
    {
      title: "Inspeções Visual e Eletromagnética",
      description: "Guias completos para inspeção visual e eletromagnética de cabos de aço, incluindo calibração de equipamentos.",
      icon: Search,
      href: "/inspecoes",
      color: "primary"
    },
    {
      title: "Procedimentos Técnicos",
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
      title: "Modelos de Relatórios",
      description: "Templates padronizados para relatórios de inspeção, instalação e manutenção.",
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
      title: "Dúvidas Frequentes",
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
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="mb-12 space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Documentação da Equipe
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
