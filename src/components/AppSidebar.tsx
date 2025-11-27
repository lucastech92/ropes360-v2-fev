import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Wrench,
  Users,
  CheckSquare,
  Package,
  ClipboardList,
  GraduationCap,
  FileBarChart,
  AlertCircle,
  HelpCircle,
  History,
  MessageSquare,
  Home,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from "@/components/ui/sidebar";

const knowledgeItems = [
  { title: "Procedimentos Oficiais", url: "/procedimentos-oficiais", icon: BookOpen },
  { title: "Procedimentos Técnicos", url: "/procedimentos-tecnicos", icon: FileText },
  { title: "Treinamento", url: "/treinamento", icon: GraduationCap },
  { title: "Resolução Problemas", url: "/resolucao-problemas", icon: AlertCircle },
  { title: "Dúvidas Frequentes", url: "/duvidas-frequentes", icon: HelpCircle },
];

const operationsItems = [
  { title: "Novo Serviço", url: "/novo-servico", icon: ClipboardList },
  { title: "Serviços", url: "/servicos", icon: FileBarChart },
  { title: "Check-List", url: "/checklist", icon: CheckSquare },
  { title: "Manutenção", url: "/manutencao", icon: Wrench },
  { title: "Inspeção Cabo de Aço", url: "/wire-rope-inspection", icon: CheckSquare },
];

const managementItems = [
  { title: "Inventário", url: "/inventario", icon: Package },
  { title: "Histórico", url: "/historico", icon: History },
  { title: "Modelos e Relatórios", url: "/modelos-relatorios", icon: FileBarChart },
  { title: "Gerenciar Usuários", url: "/gerenciar-usuarios", icon: Users },
  { title: "Assistente Técnico", url: "/assistente-tecnico", icon: MessageSquare },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  
  const isInGroup = (items: typeof knowledgeItems) => 
    items.some(item => location.pathname === item.url);

  return (
    <Sidebar className="border-r border-border bg-background">
      <SidebarHeader className="border-b border-border p-4">
        <NavLink to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" end>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Home className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm">Ropes 360</div>
            <div className="text-xs text-muted-foreground">Intelligence Center</div>
          </div>
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conhecimento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {knowledgeItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
