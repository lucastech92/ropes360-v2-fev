import { Link, useLocation } from "react-router-dom";
import { BriefcaseBusiness, ClipboardCheck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const getServiceIdFromLocation = (pathname: string, search: string) => {
  const fromQuery = new URLSearchParams(search).get("serviceId");
  if (fromQuery) return fromQuery;

  return pathname.match(/^\/servico\/([^/]+)\/timeline$/)?.[1] ?? null;
};

export const OperationalQuickNav = () => {
  const location = useLocation();
  const serviceId = getServiceIdFromLocation(location.pathname, location.search);

  const items = [
    {
      label: serviceId ? "JBR atual" : "JBRs",
      href: serviceId ? `/servico/${serviceId}/timeline` : "/servicos",
      icon: BriefcaseBusiness,
      active: location.pathname === "/servicos"
        || location.pathname.startsWith("/novo-servico")
        || location.pathname.startsWith("/editar-servico")
        || location.pathname.startsWith("/servico/"),
    },
    {
      label: "Checklists",
      href: serviceId ? `/checklist?serviceId=${serviceId}` : "/checklist",
      icon: ClipboardCheck,
      active: location.pathname.startsWith("/checklist"),
    },
    {
      label: "Inventário",
      href: "/inventario",
      icon: Package,
      active: location.pathname.startsWith("/inventario")
        || location.pathname.startsWith("/equipamentos")
        || location.pathname.startsWith("/manutencao"),
    },
  ];

  return (
    <div className="hidden items-center gap-0.5 md:flex" aria-label="Atalhos operacionais">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant={item.active ? "secondary" : "ghost"}
                size="sm"
                className={cn("gap-1.5 px-2.5", item.active && "text-primary")}
              >
                <Link to={item.href} aria-current={item.active ? "page" : undefined}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
