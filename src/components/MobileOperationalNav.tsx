import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { BriefcaseBusiness, ClipboardCheck, Home, Package } from "lucide-react";
import { getServiceIdFromLocation } from "@/components/OperationalQuickNav";
import { cn } from "@/lib/utils";

export const MobileOperationalNav = () => {
  const location = useLocation();
  const serviceId = getServiceIdFromLocation(location.pathname, location.search);

  useEffect(() => {
    document.body.classList.add("has-mobile-operational-nav");
    return () => document.body.classList.remove("has-mobile-operational-nav");
  }, []);

  const items = [
    { label: "Início", href: "/", icon: Home, active: location.pathname === "/" },
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
      label: "Checklist",
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
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      aria-label="Navegação operacional móvel"
    >
      <div className="grid h-16 grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-muted-foreground transition-colors",
                item.active && "text-primary",
              )}
            >
              <span className={cn("rounded-xl p-1.5", item.active && "bg-primary/10")}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
