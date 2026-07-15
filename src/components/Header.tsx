import { Link, useNavigate } from "react-router-dom";
import { Download, FileText, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { NotificationBell } from "./NotificationBell";
import { LanguageSelector } from "./LanguageSelector";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { NavigationBreadcrumb } from "./NavigationBreadcrumb";
import { ForceUpdateButton } from "./ForceUpdateButton";
import { CommandPaletteHeaderButton } from "./CommandPalette";
import { DesktopModuleNav } from "./DesktopModuleNav";

const Header = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Erro ao sair", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/auth");
  };

  return <>
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"><FileText className="h-4 w-4 text-primary-foreground" /></div>
            <span className="text-sm font-semibold md:text-base">{t("header.title")}</span>
          </Link>
        </div>

        <nav className="flex items-center gap-1">
          <DesktopModuleNav />
          <div className="mx-1 hidden h-6 w-px bg-border xl:block" />
          <CommandPaletteHeaderButton />
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Configurações"><Settings className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Preferências</DropdownMenuLabel><DropdownMenuSeparator />
              <div className="flex items-center justify-between px-2 py-1.5 text-sm"><span>Tema</span><ThemeToggle /></div>
              <div className="flex items-center justify-between px-2 py-1.5 text-sm"><span>Idioma</span><LanguageSelector /></div>
              <div className="flex items-center justify-between px-2 py-1.5 text-sm"><span>Atualização</span><ForceUpdateButton /></div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/install"><Download className="mr-2 h-4 w-4" />Instalar aplicativo</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />{t("header.logout")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
    <NavigationBreadcrumb />
  </>;
};

export default Header;
