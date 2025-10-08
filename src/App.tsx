import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProcedimentosOficiais from "./pages/ProcedimentosOficiais";
import Inspecoes from "./pages/Inspecoes";
import ProcedimentosTecnicos from "./pages/ProcedimentosTecnicos";
import Treinamento from "./pages/Treinamento";
import ModelosRelatorios from "./pages/ModelosRelatorios";
import ResolucaoProblemas from "./pages/ResolucaoProblemas";
import DuvidasFrequentes from "./pages/DuvidasFrequentes";
import Historico from "./pages/Historico";
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
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/procedimentos-oficiais" element={<ProtectedRoute><ProcedimentosOficiais /></ProtectedRoute>} />
          <Route path="/inspecoes" element={<ProtectedRoute><Inspecoes /></ProtectedRoute>} />
          <Route path="/procedimentos-tecnicos" element={<ProtectedRoute><ProcedimentosTecnicos /></ProtectedRoute>} />
          <Route path="/treinamento" element={<ProtectedRoute><Treinamento /></ProtectedRoute>} />
          <Route path="/modelos-relatorios" element={<ProtectedRoute><ModelosRelatorios /></ProtectedRoute>} />
          <Route path="/resolucao-problemas" element={<ProtectedRoute><ResolucaoProblemas /></ProtectedRoute>} />
          <Route path="/duvidas-frequentes" element={<ProtectedRoute><DuvidasFrequentes /></ProtectedRoute>} />
          <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
