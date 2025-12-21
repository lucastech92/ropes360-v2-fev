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
  Settings, 
  Users, 
  Briefcase, 
  Plus, 
  Edit, 
  Sparkles, 
  Clock, 
  Truck, 
  Download,
  LayoutDashboard,
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

// Route configuration with labels and icons
const routeConfig: Record<string, { label: string; icon: LucideIcon }> = {
  "/": { label: "Início", icon: Home },
  "/dashboard": { label: "Dashboard", icon: LayoutDashboard },
  "/procedimentos-oficiais": { label: "Procedimentos Oficiais", icon: FileText },
  "/procedimentos-tecnicos": { label: "Procedimentos Técnicos", icon: BookOpen },
  "/treinamento": { label: "Treinamento", icon: GraduationCap },
  "/treinamento-iso4309": { label: "ISO 4309", icon: GraduationCap },
  "/modelos-relatorios": { label: "Modelos de Relatórios", icon: FileCheck },
  "/wire-rope-inspection": { label: "Inspeção de Cabos", icon: FileCheck },
  "/saved-reports": { label: "Relatórios Salvos", icon: FileCheck },
  "/resolucao-problemas": { label: "Resolução de Problemas", icon: Wrench },
  "/duvidas-frequentes": { label: "Dúvidas Frequentes", icon: HelpCircle },
  "/historico": { label: "Histórico", icon: History },
  "/checklist": { label: "Checklist", icon: ClipboardCheck },
  "/inventario": { label: "Inventário", icon: Package },
  "/manutencao": { label: "Manutenção", icon: Settings },
  "/gerenciar-usuarios": { label: "Gerenciar Usuários", icon: Users },
  "/servicos": { label: "Serviços", icon: Briefcase },
  "/novo-servico": { label: "Novo Serviço", icon: Plus },
  "/editar-servico": { label: "Editar Serviço", icon: Edit },
  "/assistente-tecnico": { label: "Assistente IA", icon: Sparkles },
  "/folha-ponto": { label: "Folha de Ponto", icon: Clock },
  "/equipamentos": { label: "Equipamentos", icon: Truck },
  "/meus-downloads": { label: "Meus Downloads", icon: Download },
};

// Route hierarchy for parent paths
const routeParents: Record<string, string> = {
  "/treinamento-iso4309": "/treinamento",
  "/wire-rope-inspection": "/modelos-relatorios",
  "/saved-reports": "/modelos-relatorios",
  "/novo-servico": "/servicos",
  "/editar-servico": "/servicos",
};

export const NavigationBreadcrumb = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Don't show breadcrumbs on home page or auth pages
  if (currentPath === "/" || currentPath === "/auth" || currentPath === "/install") {
    return null;
  }

  // Build breadcrumb trail
  const buildBreadcrumbs = () => {
    const breadcrumbs: { path: string; label: string; icon: LucideIcon }[] = [];
    
    // Always start with home
    breadcrumbs.push({ path: "/", label: "Início", icon: Home });

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
