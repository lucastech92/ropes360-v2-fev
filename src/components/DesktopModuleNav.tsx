import { Link, useLocation } from "react-router-dom";
import { BookOpen, Boxes, BriefcaseBusiness, CalendarDays, ChevronDown, ClipboardCheck, FileText, History, Package, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUserRole } from "@/hooks/useUserRole";

const sections = [
  { label: "Operação", icon: BriefcaseBusiness, items: [
    { label: "Visão da operação", href: "/dashboard", icon: BriefcaseBusiness },
    { label: "JBRs e serviços", href: "/servicos", icon: BriefcaseBusiness },
    { label: "Checklists", href: "/checklist", icon: ClipboardCheck },
    { label: "Modelos e pacotes", href: "/modelos-relatorios", icon: FileText },
  ] },
  { label: "Recursos", icon: Boxes, items: [
    { label: "Inventário e estoque", href: "/inventario", icon: Package },
    { label: "Equipamentos", href: "/equipamentos", icon: Boxes },
    { label: "Certificações", href: "/certificacoes", icon: ShieldCheck, restricted: true },
  ] },
  { label: "Conhecimento", icon: BookOpen, items: [
    { label: "Central de conhecimento", href: "/assistente-tecnico", icon: Sparkles },
    { label: "Procedimentos oficiais", href: "/procedimentos-oficiais", icon: BookOpen, restricted: true },
    { label: "Treinamento ISO 4309", href: "/treinamento-iso4309", icon: ShieldCheck },
  ] },
  { label: "Gestão", icon: Users, restricted: true, items: [
    { label: "Calendário", href: "/calendario", icon: CalendarDays },
    { label: "Histórico", href: "/historico", icon: History },
    { label: "Equipe e usuários", href: "/gerenciar-usuarios", icon: Users },
  ] },
];

export const DesktopModuleNav = () => {
  const location = useLocation();
  const { isInspector } = useUserRole();
  return <div className="hidden items-center gap-0.5 xl:flex">
    {sections.filter(section => !isInspector || !section.restricted).map(section => {
      const items = section.items.filter(item => !isInspector || !item.restricted);
      const active = items.some(item => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`));
      const Icon = section.icon;
      return <DropdownMenu key={section.label}>
        <DropdownMenuTrigger asChild><Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-1.5"><Icon className="h-4 w-4" />{section.label}<ChevronDown className="h-3 w-3 opacity-60" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>{section.label}</DropdownMenuLabel><DropdownMenuSeparator />
          {items.map(item => {
            const ItemIcon = item.icon;
            const itemActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
            return <DropdownMenuItem key={item.href} asChild className={itemActive ? "bg-muted" : ""}><Link to={item.href} className="flex cursor-pointer items-center gap-3"><ItemIcon className="h-4 w-4 text-muted-foreground" />{item.label}{itemActive && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}</Link></DropdownMenuItem>;
          })}
        </DropdownMenuContent>
      </DropdownMenu>;
    })}
  </div>;
};
