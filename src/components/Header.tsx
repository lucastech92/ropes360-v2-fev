import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileText, LogOut, LayoutDashboard, Home, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { NotificationBell } from "./NotificationBell";
import { LanguageSelector } from "./LanguageSelector";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { NavigationBreadcrumb } from "./NavigationBreadcrumb";
import { ForceUpdateButton } from "./ForceUpdateButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

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
      navigate("/auth");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 md:h-16 items-center justify-between px-4">
          {/* Left side - Logo and Mobile Nav */}
          <div className="flex items-center gap-2">
            <MobileNav />
            <Link 
              to="/" 
              className="group flex items-center gap-2 md:gap-3 transition-all hover:opacity-90"
            >
              <div className="relative flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm md:text-base font-bold leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {t('header.title')}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                  {t('header.subtitle')}
                </span>
              </div>
            </Link>
          </div>
          
          {/* Right side - Navigation */}
          <nav className="flex items-center gap-1 md:gap-1.5">
            {/* Desktop navigation buttons */}
            <div className="hidden md:flex items-center gap-1">
              {location.pathname !== "/" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" asChild className="gap-2">
                      <Link to="/">
                        <Home className="h-4 w-4" />
                        <span className="hidden lg:inline">Principal</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Página Principal</TooltipContent>
                </Tooltip>
              )}
              {location.pathname !== "/dashboard" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" asChild className="gap-2">
                      <Link to="/dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="hidden lg:inline">{t('header.dashboard')}</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Dashboard</TooltipContent>
                </Tooltip>
              )}
              {location.pathname !== "/assistente-tecnico" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" asChild className="gap-2">
                      <Link to="/assistente-tecnico">
                        <Sparkles className="h-4 w-4" />
                        <span className="hidden lg:inline">Assistente IA</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Assistente Técnico IA</TooltipContent>
                </Tooltip>
              )}
              {location.pathname !== "/install" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" asChild className="gap-2">
                      <Link to="/install">
                        <Download className="h-4 w-4" />
                        <span className="hidden lg:inline">Instalar App</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Instalar App</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Divider */}
            <div className="hidden md:block h-6 w-px bg-border mx-1" />
            
            {/* Actions */}
            <div className="flex items-center gap-0.5 md:gap-1">
              <ForceUpdateButton />
              <ThemeToggle />
              <LanguageSelector />
              <NotificationBell />
            </div>
            
            {/* Desktop logout */}
            <div className="hidden md:block h-6 w-px bg-border mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout} 
                  className="hidden md:flex gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">{t('header.logout')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sair</TooltipContent>
            </Tooltip>
          </nav>
        </div>
      </header>
      <NavigationBreadcrumb />
    </>
  );
};

export default Header;