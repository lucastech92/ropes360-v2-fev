import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProcedimentosOficiais from "./pages/ProcedimentosOficiais";
import ProcedimentosTecnicos from "./pages/ProcedimentosTecnicos";
import Treinamento from "./pages/Treinamento";
import ModelosRelatorios from "./pages/ModelosRelatorios";
import ResolucaoProblemas from "./pages/ResolucaoProblemas";
import DuvidasFrequentes from "./pages/DuvidasFrequentes";
import Historico from "./pages/Historico";
import CheckList from "./pages/CheckList";
import Inventario from "./pages/Inventario";
import WireRopeInspection from "./pages/WireRopeInspection";
import Manutencao from "./pages/Manutencao";
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import Servicos from "./pages/Servicos";
import NovoServico from "./pages/NovoServico";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/documentos" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/procedimentos-oficiais" element={<ProtectedRoute><ProcedimentosOficiais /></ProtectedRoute>} />
          <Route path="/procedimentos-tecnicos" element={<ProtectedRoute><ProcedimentosTecnicos /></ProtectedRoute>} />
          <Route path="/treinamento" element={<ProtectedRoute><Treinamento /></ProtectedRoute>} />
          <Route path="/modelos-relatorios" element={<ProtectedRoute><ModelosRelatorios /></ProtectedRoute>} />
          <Route path="/wire-rope-inspection" element={<ProtectedRoute><WireRopeInspection /></ProtectedRoute>} />
          <Route path="/resolucao-problemas" element={<ProtectedRoute><ResolucaoProblemas /></ProtectedRoute>} />
          <Route path="/duvidas-frequentes" element={<ProtectedRoute><DuvidasFrequentes /></ProtectedRoute>} />
          <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
          <Route path="/checklist" element={<ProtectedRoute><CheckList /></ProtectedRoute>} />
          <Route path="/inventario" element={<ProtectedRoute><Inventario /></ProtectedRoute>} />
          <Route path="/manutencao" element={<ProtectedRoute><Manutencao /></ProtectedRoute>} />
          <Route path="/gerenciar-usuarios" element={<ProtectedRoute><GerenciarUsuarios /></ProtectedRoute>} />
            <Route path="/servicos" element={<ProtectedRoute><Servicos /></ProtectedRoute>} />
            <Route path="/novo-servico" element={<ProtectedRoute><NovoServico /></ProtectedRoute>} />
            <Route path="/editar-servico/:id" element={<ProtectedRoute><NovoServico /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
