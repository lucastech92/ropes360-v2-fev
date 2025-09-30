import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProcedimentosOficiais from "./pages/ProcedimentosOficiais";
import Inspecoes from "./pages/Inspecoes";
import ProcedimentosTecnicos from "./pages/ProcedimentosTecnicos";
import Treinamento from "./pages/Treinamento";
import ModelosRelatorios from "./pages/ModelosRelatorios";
import ResolucaoProblemas from "./pages/ResolucaoProblemas";
import DuvidasFrequentes from "./pages/DuvidasFrequentes";
import Historico from "./pages/Historico";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/procedimentos-oficiais" element={<ProcedimentosOficiais />} />
          <Route path="/inspecoes" element={<Inspecoes />} />
          <Route path="/procedimentos-tecnicos" element={<ProcedimentosTecnicos />} />
          <Route path="/treinamento" element={<Treinamento />} />
          <Route path="/modelos-relatorios" element={<ModelosRelatorios />} />
          <Route path="/resolucao-problemas" element={<ResolucaoProblemas />} />
          <Route path="/duvidas-frequentes" element={<DuvidasFrequentes />} />
          <Route path="/historico" element={<Historico />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
