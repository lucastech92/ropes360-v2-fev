import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useLanguagePreference } from "./hooks/useLanguagePreference";
import { ThemeProvider } from "./components/ThemeProvider";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProcedimentosOficiais from "./pages/ProcedimentosOficiais";
import ProcedimentosTecnicos from "./pages/ProcedimentosTecnicos";
import Treinamento from "./pages/Treinamento";
import TreinamentoISO4309 from "./pages/TreinamentoISO4309";
import ModelosRelatorios from "./pages/ModelosRelatorios";
import ResolucaoProblemas from "./pages/ResolucaoProblemas";
import DuvidasFrequentes from "./pages/DuvidasFrequentes";
import Historico from "./pages/Historico";
import CheckList from "./pages/CheckList";
import Inventario from "./pages/Inventario";
import WireRopeInspection from "./pages/WireRopeInspection";
import SavedReports from "./pages/SavedReports";
import Manutencao from "./pages/Manutencao";
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import Servicos from "./pages/Servicos";
import NovoServico from "./pages/NovoServico";
import AssistenteTecnico from "./pages/AssistenteTecnico";
import Install from "./pages/Install";
import FolhaPonto from "./pages/FolhaPonto";
import Equipamentos from "./pages/Equipamentos";
import MeusDownloads from "./pages/MeusDownloads";
import Calendario from "./pages/Calendario";
// import { ProtectedRoute } from "./components/ProtectedRoute"; // Temporarily disabled
import { OfflineIndicator } from "./components/OfflineIndicator";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { NotificationPermissionPrompt } from "./components/NotificationPermissionPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { VersionIndicator } from "./components/VersionIndicator";

const queryClient = new QueryClient();

const App = () => {
  useLanguagePreference();
  
  return (
    <ThemeProvider defaultTheme="system" storageKey="ropes360-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <PWAInstallPrompt />
          <NotificationPermissionPrompt />
          <PWAUpdatePrompt />
          <VersionIndicator />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/install" element={<Install />} />
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/procedimentos-oficiais" element={<ProcedimentosOficiais />} />
              <Route path="/procedimentos-tecnicos" element={<ProcedimentosTecnicos />} />
              <Route path="/treinamento" element={<Treinamento />} />
              <Route path="/modelos-relatorios" element={<ModelosRelatorios />} />
              <Route path="/wire-rope-inspection" element={<WireRopeInspection />} />
              <Route path="/saved-reports" element={<SavedReports />} />
              <Route path="/resolucao-problemas" element={<ResolucaoProblemas />} />
              <Route path="/duvidas-frequentes" element={<DuvidasFrequentes />} />
              <Route path="/historico" element={<Historico />} />
              <Route path="/checklist" element={<CheckList />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/manutencao" element={<Manutencao />} />
              <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios />} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="/novo-servico" element={<NovoServico />} />
              <Route path="/editar-servico/:id" element={<NovoServico />} />
              <Route path="/assistente-tecnico" element={<AssistenteTecnico />} />
              <Route path="/folha-ponto" element={<FolhaPonto />} />
              <Route path="/equipamentos" element={<Equipamentos />} />
              <Route path="/meus-downloads" element={<MeusDownloads />} />
              <Route path="/treinamento-iso4309" element={<TreinamentoISO4309 />} />
              <Route path="/calendario" element={<Calendario />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
