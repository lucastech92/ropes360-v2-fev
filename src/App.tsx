import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useLanguagePreference } from "./hooks/useLanguagePreference";
import { ThemeProvider } from "./components/ThemeProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
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
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import Servicos from "./pages/Servicos";
import NovoServico from "./pages/NovoServico";
import AssistenteTecnico from "./pages/AssistenteTecnico";
import Install from "./pages/Install";
import FolhaPonto from "./pages/FolhaPonto";
import MeusDownloads from "./pages/MeusDownloads";
import Calendario from "./pages/Calendario";
import Certificacoes from "./pages/Certificacoes";
import ServiceTimeline from "./pages/ServiceTimeline";
import RelatorioExecutivo from "./pages/RelatorioExecutivo";
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
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/procedimentos-oficiais" element={<ProtectedRoute><ProcedimentosOficiais /></ProtectedRoute>} />
              <Route path="/procedimentos-tecnicos" element={<ProtectedRoute><ProcedimentosTecnicos /></ProtectedRoute>} />
              <Route path="/treinamento" element={<ProtectedRoute><Treinamento /></ProtectedRoute>} />
              <Route path="/modelos-relatorios" element={<ProtectedRoute><ModelosRelatorios /></ProtectedRoute>} />
              <Route path="/wire-rope-inspection" element={<ProtectedRoute><WireRopeInspection /></ProtectedRoute>} />
              <Route path="/saved-reports" element={<ProtectedRoute><SavedReports /></ProtectedRoute>} />
              <Route path="/resolucao-problemas" element={<ProtectedRoute><ResolucaoProblemas /></ProtectedRoute>} />
              <Route path="/duvidas-frequentes" element={<ProtectedRoute><DuvidasFrequentes /></ProtectedRoute>} />
              <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
              <Route path="/checklist" element={<ProtectedRoute><CheckList /></ProtectedRoute>} />
              <Route path="/inventario" element={<ProtectedRoute><Inventario /></ProtectedRoute>} />
              <Route path="/manutencao" element={<Navigate to="/inventario?tab=maintenance" replace />} />
              <Route path="/equipamentos" element={<Navigate to="/inventario?tab=items&type=equipamento" replace />} />
              <Route path="/gerenciar-usuarios" element={<ProtectedRoute><GerenciarUsuarios /></ProtectedRoute>} />
              <Route path="/servicos" element={<ProtectedRoute><Servicos /></ProtectedRoute>} />
              <Route path="/novo-servico" element={<ProtectedRoute><NovoServico /></ProtectedRoute>} />
              <Route path="/editar-servico/:id" element={<ProtectedRoute><NovoServico /></ProtectedRoute>} />
              <Route path="/assistente-tecnico" element={<ProtectedRoute><AssistenteTecnico /></ProtectedRoute>} />
              <Route path="/folha-ponto" element={<ProtectedRoute><FolhaPonto /></ProtectedRoute>} />
              <Route path="/meus-downloads" element={<ProtectedRoute><MeusDownloads /></ProtectedRoute>} />
              <Route path="/treinamento-iso4309" element={<ProtectedRoute><TreinamentoISO4309 /></ProtectedRoute>} />
              <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
              <Route path="/certificacoes" element={<ProtectedRoute><Certificacoes /></ProtectedRoute>} />
              <Route path="/servico/:id/timeline" element={<ProtectedRoute><ServiceTimeline /></ProtectedRoute>} />
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
