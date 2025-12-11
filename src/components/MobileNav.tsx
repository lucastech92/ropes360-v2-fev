import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  LogOut, 
  ClipboardList, 
  Package, 
  Settings, 
  Calendar, 
  Shield,
  History,
  Wrench,
  GraduationCap,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export const MobileNav = () => {
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      setOpen(false);
    }
  };

  const navItems: { section: string; items: NavItem[] }[] = [
    {
      section: "Principal",
      items: [
        { label: t('header.dashboard'), href: "/", icon: LayoutDashboard },
        { label: t('header.documents'), href: "/documentos", icon: FileText },
      ]
    },
    {
      section: t('modules.knowledge'),
      items: [
        { label: t('modules.procedimentosOficiais'), href: "/procedimentos-oficiais", icon: FileText },
        { label: t('modules.manuaisBridon'), href: "/procedimentos-tecnicos", icon: Wrench },
        { label: t('modules.treinamento'), href: "/treinamento", icon: GraduationCap },
        { label: "Resolução de Problemas", href: "/resolucao-problemas", icon: AlertTriangle },
        { label: t('modules.duvidasFrequentes'), href: "/duvidas-frequentes", icon: HelpCircle },
      ]
    },
    {
      section: t('modules.operations'),
      items: [
        { label: t('modules.servicos'), href: "/servicos", icon: ClipboardList },
        { label: t('modules.checkLists'), href: "/checklist", icon: ClipboardList },
        { label: t('modules.inventario'), href: "/inventario", icon: Package },
        { label: t('modules.modelosRelatorios'), href: "/modelos-relatorios", icon: FileText },
      ]
    },
    {
      section: t('modules.management'),
      items: [
        { label: t('modules.historico'), href: "/historico", icon: History },
        { label: t('modules.controleManutencao'), href: "/manutencao", icon: Settings },
        { label: t('modules.folhaPonto'), href: "/folha-ponto", icon: Calendar },
        { label: "Gerenciar Usuários", href: "/gerenciar-usuarios", icon: Shield },
      ]
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Ropes 360</span>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-4 space-y-4">
            {navItems.map((section) => (
              <div key={section.section}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {section.section}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
                <Separator className="my-3" />
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('header.logout')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
