import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  ChevronRight, 
  FileText, 
  BookOpen, 
  GraduationCap, 
  FileCheck, 
  Wrench, 
  HelpCircle, 
  History, 
  ClipboardCheck, 
  Package, 
  Users, 
  Briefcase, 
  Plus, 
  Edit, 
  Sparkles, 
  Clock, 
  Download,
  LayoutDashboard,
  Award,
  CalendarDays,
  type LucideIcon
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTranslation } from "react-i18next";

export const NavigationBreadcrumb = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useTranslation();

  // Don't show breadcrumbs on home page or auth pages
  if (currentPath === "/" || currentPath === "/auth" || currentPath === "/install") {
    return null;
  }

  // Route configuration with labels and icons
  const routeConfig: Record<string, { label: string; icon: LucideIcon }> = {
    "/": { label: t('nav.home'), icon: Home },
    "/dashboard": { label: t('nav.dashboard'), icon: LayoutDashboard },
    "/procedimentos-oficiais": { label: t('nav.officialProcedures'), icon: FileText },
    "/procedimentos-tecnicos": { label: t('nav.technicalProcedures'), icon: BookOpen },
    "/treinamento": { label: t('nav.training'), icon: GraduationCap },
    "/treinamento-iso4309": { label: t('nav.iso4309'), icon: GraduationCap },
    "/modelos-relatorios": { label: t('nav.reportTemplates'), icon: FileCheck },
    "/wire-rope-inspection": { label: t('nav.wireRopeInspection'), icon: FileCheck },
    "/saved-reports": { label: t('nav.savedReports'), icon: FileCheck },
    "/resolucao-problemas": { label: t('nav.troubleshooting'), icon: Wrench },
    "/duvidas-frequentes": { label: t('nav.faq'), icon: HelpCircle },
    "/historico": { label: t('nav.history'), icon: History },
    "/checklist": { label: t('nav.checklist'), icon: ClipboardCheck },
    "/inventario": { label: t('nav.inventory'), icon: Package },
    "/gerenciar-usuarios": { label: t('nav.manageUsers'), icon: Users },
    "/servicos": { label: t('nav.services'), icon: Briefcase },
    "/novo-servico": { label: t('nav.newService'), icon: Plus },
    "/editar-servico": { label: t('nav.editService'), icon: Edit },
    "/assistente-tecnico": { label: t('nav.aiAssistant'), icon: Sparkles },
    "/folha-ponto": { label: t('nav.timesheet'), icon: Clock },
    "/meus-downloads": { label: t('nav.myDownloads'), icon: Download },
    "/calendario": { label: t('nav.calendar'), icon: CalendarDays },
    "/certificacoes": { label: t('nav.certifications'), icon: Award },
  };

  // Route hierarchy for parent paths
  const routeParents: Record<string, string> = {
    "/treinamento-iso4309": "/treinamento",
    "/wire-rope-inspection": "/modelos-relatorios",
    "/saved-reports": "/modelos-relatorios",
    "/novo-servico": "/servicos",
    "/editar-servico": "/servicos",
  };

  // Build breadcrumb trail
  const buildBreadcrumbs = () => {
    const breadcrumbs: { path: string; label: string; icon: LucideIcon }[] = [];
    
    // Always start with home
    breadcrumbs.push({ path: "/", label: t('nav.home'), icon: Home });

    // Check if current path has a parent
    let pathToCheck = currentPath;
    
    // Handle dynamic routes like /editar-servico/:id
    const dynamicPathMatch = currentPath.match(/^(\/editar-servico)\/[\w-]+$/);
    if (dynamicPathMatch) {
      pathToCheck = dynamicPathMatch[1];
    }

    // Add parent if exists
    const parentPath = routeParents[pathToCheck];
    if (parentPath && routeConfig[parentPath]) {
      breadcrumbs.push({ 
        path: parentPath, 
        label: routeConfig[parentPath].label,
        icon: routeConfig[parentPath].icon
      });
    }

    // Add current page
    const currentConfig = routeConfig[pathToCheck] || routeConfig[currentPath];
    if (currentConfig) {
      breadcrumbs.push({ 
        path: currentPath, 
        label: currentConfig.label,
        icon: currentConfig.icon
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <div className="w-full border-b bg-muted/30 backdrop-blur-sm">
      <div className="container px-4 py-2">
        <Breadcrumb>
          <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const IconComponent = crumb.icon;

              return (
                <BreadcrumbItem key={crumb.path}>
                  {index > 0 && (
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </BreadcrumbSeparator>
                  )}
                  {isLast ? (
                    <BreadcrumbPage className="flex items-center gap-1.5 font-medium text-foreground">
                      <IconComponent className="h-3.5 w-3.5 text-primary" />
                      <span>{crumb.label}</span>
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        to={crumb.path}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                        <span>{crumb.label}</span>
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
};
