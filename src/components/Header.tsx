import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileText, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { NotificationBell } from "./NotificationBell";
import { LanguageSelector } from "./LanguageSelector";
import { MobileNav } from "./MobileNav";

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
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 md:h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link to="/" className="flex items-center space-x-2 md:space-x-3 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm md:text-lg font-bold leading-tight">{t('header.title')}</span>
              <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{t('header.subtitle')}</span>
            </div>
          </Link>
        </div>
        
        <nav className="flex items-center gap-1 md:gap-2">
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-2">
            {location.pathname !== "/" && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  {t('header.dashboard')}
                </Link>
              </Button>
            )}
            {location.pathname !== "/procedimentos-oficiais" && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/procedimentos-oficiais">
                  <FileText className="mr-2 h-4 w-4" />
                  {t('header.documents')}
                </Link>
              </Button>
            )}
          </div>
          
          <LanguageSelector />
          <NotificationBell />
          
          {/* Desktop logout */}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex">
            <LogOut className="mr-2 h-4 w-4" />
            {t('header.logout')}
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
