import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import ModuleCard from "@/components/ModuleCard";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { HealthScoreGauge } from "@/components/dashboard/HealthScoreGauge";
import { CommandPaletteTrigger } from "@/components/CommandPalette";
import { InspectorHome } from "@/components/dashboard/InspectorHome";
import { FileCheck, Wrench, GraduationCap, FileText, AlertTriangle, HelpCircle, History, ClipboardList, Package, FolderOpen, Shield, Calendar, CalendarDays, Sparkles, ArrowRight, BookOpen, Briefcase, BarChart3, Download, ChevronDown, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderManager } from "@/components/FolderManager";
import { DocumentUploadWithTags } from "@/components/DocumentUploadWithTags";
import { DocumentListWithTags } from "@/components/DocumentListWithTags";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const { t } = useTranslation();
  const { isInspector } = useUserRole();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const knowledgeRef = useRef<HTMLElement>(null);
  const operationsRef = useRef<HTMLElement>(null);
  const managementRef = useRef<HTMLElement>(null);
  const foldersRef = useRef<HTMLElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const modulesByCategory = {
    knowledge: [
      { title: t('modules.procedimentosOficiais'), description: t('modules.descriptions.officialProcedures'), icon: FileCheck, href: "/procedimentos-oficiais", color: "primary" },
      { title: t('modules.duvidasFrequentes'), description: t('modules.descriptions.faq'), icon: HelpCircle, href: "/duvidas-frequentes", color: "primary" },
    ],
    operations: [
      { title: t('modules.servicos'), description: t('modules.descriptions.services'), icon: ClipboardList, href: "/servicos", color: "accent" },
      { title: t('modules.checkLists'), description: t('modules.descriptions.checklists'), icon: ClipboardList, href: "/checklist", color: "accent" },
      { title: t('modules.modelosRelatorios'), description: t('modules.descriptions.reportTemplates'), icon: FileText, href: "/modelos-relatorios", color: "accent" },
      { title: t('modules.inventario'), description: t('modules.descriptions.inventory'), icon: Package, href: "/inventario", color: "accent" },
    ],
    management: [
      { title: t('modules.calendar'), description: t('modules.descriptions.calendar'), icon: CalendarDays, href: "/calendario", color: "accent" },
      { title: t('modules.certificacoes'), description: t('modules.descriptions.certifications'), icon: Award, href: "/certificacoes", color: "accent" },
      { title: t('modules.historico'), description: t('modules.descriptions.history'), icon: History, href: "/historico", color: "primary" },
      { title: t('modules.folhaPonto'), description: t('modules.descriptions.timesheet'), icon: Calendar, href: "/folha-ponto", color: "primary" },
      { title: t('modules.gerenciarUsuarios'), description: t('modules.descriptions.manageUsers'), icon: Shield, href: "/gerenciar-usuarios", color: "primary" },
    ],
  };

  const allNavItems = [
    { label: t('modules.knowledge'), icon: BookOpen, ref: knowledgeRef, color: "bg-primary/10 text-primary", key: "knowledge" },
    { label: t('modules.operations'), icon: Briefcase, ref: operationsRef, color: "bg-accent/10 text-accent-foreground", key: "operations" },
    { label: t('modules.management'), icon: BarChart3, ref: managementRef, color: "bg-primary/10 text-primary", key: "management" },
    { label: t('home.myFolders'), icon: FolderOpen, ref: foldersRef, color: "bg-primary/10 text-primary", key: "folders" },
  ];
  const navItems = isInspector ? allNavItems.filter((n) => n.key === "operations") : allNavItems;

  const handleFolderSelect = (folderId: string | null, folderName: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
            <div className="absolute top-20 -left-20 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="container relative py-10 md:py-16 px-4">
            <div className="mx-auto max-w-4xl text-center space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2 animate-fade-in">
                <Sparkles className="h-4 w-4" />
                <span>{t('home.heroBadge')}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight animate-fade-in">
                <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
                  Ropes 360
                </span>
              </h1>

              <p className="mx-auto max-w-2xl text-base md:text-lg text-muted-foreground animate-fade-in">
                {t('home.heroDescription')}
                {" "}<span className="text-foreground font-medium">{t('home.heroHighlight')}</span> {t('home.heroHighlightSuffix')}
              </p>

              <div className="flex justify-center pt-2 animate-fade-in">
                <CommandPaletteTrigger />
              </div>

              <div className="flex justify-center pt-1 animate-fade-in">
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <Link to="/install">
                    <Download className="h-4 w-4" />
                    {t('home.installAppButton')}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Navigation Bar */}
        <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
          <div className="container px-4">
            <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollTo(item.ref)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap shrink-0"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Health Score + Metrics Section */}
        {/* Personalized Dashboard */}
        <section className="container py-8 md:py-10 px-4 space-y-6">
          {isInspector ? (
            <InspectorHome />
          ) : (
            <>
              <HealthScoreGauge compact />
              <DashboardMetrics />
            </>
          )}
        </section>

        {/* Modules Sections */}
        <div className="container px-4 space-y-10 md:space-y-14 pb-12">
          {!isInspector && (
            <section ref={knowledgeRef} className="scroll-mt-20 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">{t('modules.knowledge')}</h2>
                  <p className="text-sm text-muted-foreground">{t('modules.descriptions.knowledgeSubtitle')}</p>
                </div>
              </div>
              <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {modulesByCategory.knowledge.map((module) => (
                  <ModuleCard key={module.href} {...module} />
                ))}
              </div>
            </section>
          )}

          {/* Operations Section */}
          <section ref={operationsRef} className="scroll-mt-20 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <Briefcase className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{t('modules.operations')}</h2>
                <p className="text-sm text-muted-foreground">{t('modules.descriptions.operationsSubtitle')}</p>
              </div>
            </div>
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {modulesByCategory.operations.map((module) => (
                <ModuleCard key={module.href} {...module} />
              ))}
            </div>
          </section>

          {!isInspector && (
            <section ref={managementRef} className="scroll-mt-20 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">{t('modules.management')}</h2>
                  <p className="text-sm text-muted-foreground">{t('modules.descriptions.managementSubtitle')}</p>
                </div>
              </div>
              <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {modulesByCategory.management.map((module) => (
                  <ModuleCard key={module.href} {...module} />
                ))}
              </div>
            </section>
          )}

          {!isInspector && (
            <section ref={foldersRef} className="scroll-mt-20 space-y-6">
              <Card className="border-border/50 shadow-card overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-muted/50 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg md:text-xl">{t('home.myFolders')}</CardTitle>
                      <CardDescription>{t('home.myFoldersDescription')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <FolderManager category="home" onFolderSelect={handleFolderSelect} selectedFolderId={selectedFolderId} />
                </CardContent>
              </Card>

              {selectedFolderId && (
                <Card className="border-border/50 shadow-card animate-fade-in">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          {selectedFolderName}
                        </CardTitle>
                        <CardDescription>{t('home.manageDocumentsSubfolders')}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="hidden sm:flex">{t('home.selectedFolder')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="documents">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="documents">{t('home.documentsTab')}</TabsTrigger>
                        <TabsTrigger value="upload">{t('home.uploadTab')}</TabsTrigger>
                      </TabsList>
                      <TabsContent value="documents" className="mt-6">
                        <DocumentListWithTags folderId={selectedFolderId} category="home" refreshTrigger={refreshTrigger} />
                      </TabsContent>
                      <TabsContent value="upload" className="mt-6">
                        <DocumentUploadWithTags folderId={selectedFolderId} category="home" onUploadComplete={() => setRefreshTrigger((prev) => prev + 1)} />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </section>
          )}

          {/* Help Footer */}
          <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-accent/10 dark:from-primary/15 dark:via-card dark:to-accent/15 p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{t('home.needHelp')}</h3>
                <p className="text-sm text-muted-foreground">{t('home.needHelpDescription')}</p>
              </div>
              <Link to="/duvidas-frequentes" className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all hover:gap-3">
                {t('home.faqLink')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
