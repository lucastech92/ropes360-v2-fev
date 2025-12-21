import { Link, useLocation } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Route configuration with labels
const routeLabels: Record<string, string> = {
  "/": "Início",
  "/dashboard": "Dashboard",
  "/procedimentos-oficiais": "Procedimentos Oficiais",
  "/procedimentos-tecnicos": "Procedimentos Técnicos",
  "/treinamento": "Treinamento",
  "/treinamento-iso4309": "ISO 4309",
  "/modelos-relatorios": "Modelos de Relatórios",
  "/wire-rope-inspection": "Inspeção de Cabos",
  "/saved-reports": "Relatórios Salvos",
  "/resolucao-problemas": "Resolução de Problemas",
  "/duvidas-frequentes": "Dúvidas Frequentes",
  "/historico": "Histórico",
  "/checklist": "Checklist",
  "/inventario": "Inventário",
  "/manutencao": "Manutenção",
  "/gerenciar-usuarios": "Gerenciar Usuários",
  "/servicos": "Serviços",
  "/novo-servico": "Novo Serviço",
  "/editar-servico": "Editar Serviço",
  "/assistente-tecnico": "Assistente IA",
  "/folha-ponto": "Folha de Ponto",
  "/equipamentos": "Equipamentos",
  "/meus-downloads": "Meus Downloads",
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
    const breadcrumbs: { path: string; label: string }[] = [];
    
    // Always start with home
    breadcrumbs.push({ path: "/", label: "Início" });

    // Check if current path has a parent
    let pathToCheck = currentPath;
    
    // Handle dynamic routes like /editar-servico/:id
    const dynamicPathMatch = currentPath.match(/^(\/editar-servico)\/[\w-]+$/);
    if (dynamicPathMatch) {
      pathToCheck = dynamicPathMatch[1];
    }

    // Add parent if exists
    const parentPath = routeParents[pathToCheck];
    if (parentPath && routeLabels[parentPath]) {
      breadcrumbs.push({ path: parentPath, label: routeLabels[parentPath] });
    }

    // Add current page
    const currentLabel = routeLabels[pathToCheck] || routeLabels[currentPath];
    if (currentLabel) {
      breadcrumbs.push({ path: currentPath, label: currentLabel });
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
              const isFirst = index === 0;

              return (
                <BreadcrumbItem key={crumb.path}>
                  {index > 0 && (
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </BreadcrumbSeparator>
                  )}
                  {isLast ? (
                    <BreadcrumbPage className="font-medium text-foreground">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        to={crumb.path}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {isFirst && <Home className="h-3.5 w-3.5" />}
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
