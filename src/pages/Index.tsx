import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import ModuleCard from "@/components/ModuleCard";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { HomeSearch } from "@/components/HomeSearch";
import { FileCheck, Wrench, GraduationCap, FileText, AlertTriangle, HelpCircle, History, ClipboardList, Package, FolderOpen, Shield, Calendar, CalendarDays, Sparkles, ArrowRight, BookOpen, Briefcase, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderManager } from "@/components/FolderManager";
import { DocumentUploadWithTags } from "@/components/DocumentUploadWithTags";
import { DocumentListWithTags } from "@/components/DocumentListWithTags";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
const Index = () => {
  const {
    t
  } = useTranslation();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const modulesByCategory = {
    knowledge: [{
      title: t('modules.procedimentosOficiais'),
      description: "Acesse todos os procedimentos e normas oficiais da empresa, incluindo ISO 4309 e diretrizes de segurança.",
      icon: FileCheck,
      href: "/procedimentos-oficiais",
      color: "primary"
    }, {
      title: t('modules.manuaisBridon'),
      description: "Instruções detalhadas para instalação, soquetagem, remoção e manutenção de cabos de aço.",
      icon: Wrench,
      href: "/procedimentos-tecnicos",
      color: "primary"
    }, {
      title: t('modules.treinamento'),
      description: "Materiais de treinamento, glossário técnico e vídeos educativos para desenvolvimento contínuo.",
      icon: GraduationCap,
      href: "/treinamento",
      color: "primary"
    }, {
      title: "Resolução de Problemas",
      description: "Casos reais de falhas, análises de causa raiz e soluções aplicadas em campo.",
      icon: AlertTriangle,
      href: "/resolucao-problemas",
      color: "primary"
    }, {
      title: t('modules.duvidasFrequentes'),
      description: "Treinamentos, Drake, etc...",
      icon: HelpCircle,
      href: "/duvidas-frequentes",
      color: "primary"
    }],
    operations: [{
      title: t('modules.servicos'),
      description: "Gerencie todos os serviços registrados com código JBR, cliente, escopo e equipamentos.",
      icon: ClipboardList,
      href: "/servicos",
      color: "accent"
    }, {
      title: t('modules.checkLists'),
      description: "Checklists preenchíveis para montagem de containers e verificação de ferramentas (JBR).",
      icon: ClipboardList,
      href: "/checklist",
      color: "accent"
    }, {
      title: t('modules.modelosRelatorios'),
      description: "Upload e download de modelos de relatórios para inspeções e procedimentos.",
      icon: FileText,
      href: "/modelos-relatorios",
      color: "accent"
    }, {
      title: t('modules.inventario'),
      description: "Gestão unificada de consumíveis, equipamentos, manutenções e calibrações.",
      icon: Package,
      href: "/inventario",
      color: "accent"
    }],
    management: [{
      title: "Calendário Integrado",
      description: "Visualização unificada de serviços, manutenções, calibrações e folha de ponto.",
      icon: CalendarDays,
      href: "/calendario",
      color: "accent"
    }, {
      title: t('modules.historico'),
      description: "Registros de inspeções anteriores, rastreabilidade e acompanhamento de manutenções.",
      icon: History,
      href: "/historico",
      color: "primary"
    }, {
      title: t('modules.folhaPonto'),
      description: "Controle de ponto dos colaboradores com calendário interativo e tipos de check-in.",
      icon: Calendar,
      href: "/folha-ponto",
      color: "primary"
    }, {
      title: "Gerenciar Usuários",
      description: "Aprovar novos usuários e gerenciar níveis de acesso ao sistema (Admin).",
      icon: Shield,
      href: "/gerenciar-usuarios",
      color: "primary"
    }]
  };
  const handleFolderSelect = (folderId: string | null, folderName: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
  };
  return <div className="min-h-screen bg-background">
      <Header />
      
      <main className="relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 via-background to-background">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
            <div className="absolute top-20 -left-20 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="container relative py-12 md:py-20 px-4">
            <div className="mx-auto max-w-4xl text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 animate-fade-in">
                <Sparkles className="h-4 w-4" />
                <span>Centro de Inteligência Técnica</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight animate-fade-in">
                <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
                  Ropes 360
                </span>
              </h1>
              
              <p className="mx-auto max-w-2xl text-base md:text-xl text-muted-foreground animate-fade-in">Portal completo de conhecimento técnico para inspetores de campo e centralização para a equipe de suporte.
                {" "}<span className="text-foreground font-medium">Documentação, procedimentos, certificados, inventário e projetos</span> em um só lugar.
              </p>
              
              <div className="flex justify-center pt-4 animate-fade-in">
                <HomeSearch />
              </div>
            </div>
          </div>
        </section>

        {/* Metrics Section */}
        <section className="container py-8 md:py-12 px-4">
          <DashboardMetrics />
        </section>

        {/* Modules Sections */}
        <div className="container px-4 space-y-12 md:space-y-16 pb-12">
          {/* Knowledge Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{t('modules.knowledge')}</h2>
                <p className="text-sm text-muted-foreground">Base de conhecimento e documentação técnica</p>
              </div>
            </div>
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {modulesByCategory.knowledge.map(module => <ModuleCard key={module.href} {...module} />)}
            </div>
          </section>

          {/* Operations Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <Briefcase className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{t('modules.operations')}</h2>
                <p className="text-sm text-muted-foreground">Gestão de serviços e operações em campo</p>
              </div>
            </div>
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {modulesByCategory.operations.map(module => <ModuleCard key={module.href} {...module} />)}
            </div>
          </section>

          {/* Management Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{t('modules.management')}</h2>
                <p className="text-sm text-muted-foreground">Controle administrativo e gestão de recursos</p>
              </div>
            </div>
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {modulesByCategory.management.map(module => <ModuleCard key={module.href} {...module} />)}
            </div>
          </section>

          {/* My Folders Section */}
          <section className="space-y-6">
            <Card className="border-border/50 shadow-card overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-muted/50 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg md:text-xl">Minhas Pastas</CardTitle>
                    <CardDescription>
                      Crie e gerencie suas próprias pastas e documentos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <FolderManager category="home" onFolderSelect={handleFolderSelect} selectedFolderId={selectedFolderId} />
              </CardContent>
            </Card>

            {selectedFolderId && <Card className="border-border/50 shadow-card animate-fade-in">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        {selectedFolderName}
                      </CardTitle>
                      <CardDescription>
                        Gerencie documentos e subpastas
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="hidden sm:flex">
                      Pasta selecionada
                    </Badge>
                  </div>
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
              </Card>}
          </section>

          {/* Help Footer */}
          <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/5 via-card to-accent/5 p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Precisa de ajuda?</h3>
                <p className="text-sm text-muted-foreground">
                  Entre em contato com a equipe técnica ou consulte nossa documentação
                </p>
              </div>
              <Link to="/duvidas-frequentes" className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all hover:gap-3">
                Dúvidas Frequentes
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>;
};
export default Index;