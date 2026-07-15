import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { ClipboardList, Download, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/utils/exportUtils";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { getServicePhase } from "@/lib/serviceLifecycle";

interface Service {
  id: string; codigo_jbr: string; cliente: string; local: string | null; escopo: string[] | null;
  outros_escopo: string | null; aplicacao: string | null; equipamentos: string | null;
  data_inicio: string | null; data_termino: string | null; operational_status: string;
  collaborators_count?: number; checklists_count?: number;
}

const date = (value: string | null) => value ? new Date(value).toLocaleDateString("pt-BR") : "—";

const Servicos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_services_with_counts").then(({ data, error }) => {
      if (error) toast({ title: "Erro ao carregar JBRs", description: "Não foi possível carregar a lista.", variant: "destructive" });
      else setServices((data || []) as Service[]);
      setLoading(false);
    });
  }, [toast]);

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return services;
    return services.filter(service => [service.codigo_jbr, service.cliente, service.local, service.aplicacao].some(value => value?.toLowerCase().includes(term)));
  }, [services, searchTerm]);

  const handleExport = () => {
    exportToExcel(filteredServices.map(service => ({
      "Código JBR": service.codigo_jbr, Cliente: service.cliente, Local: service.local || "",
      Escopo: service.escopo?.join(", ") || "", Aplicação: service.aplicacao || "",
      "Data início": service.data_inicio || "", "Data término": service.data_termino || "",
      Fase: getServicePhase(service.operational_status).label,
    })), `servicos_${new Date().toISOString().split("T")[0]}`, "Serviços");
    toast({ title: "Planilha gerada", description: `${filteredServices.length} JBRs exportados.` });
  };

  useKeyboardShortcuts([
    { key: "n", ctrl: true, callback: () => navigate("/novo-servico"), description: "Novo JBR" },
    { key: "e", ctrl: true, callback: handleExport, description: "Exportar JBRs" },
  ]);

  return <div className="min-h-screen bg-background">
    <Header />
    <main className="container space-y-5 px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">JBRs e serviços</h1><p className="mt-1 text-sm text-muted-foreground">Selecione um JBR para acompanhar sua operação.</p></div>
        <Button onClick={() => navigate("/novo-servico")}><Plus className="mr-2 h-4 w-4" />Novo JBR</Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar por JBR, cliente, local ou aplicação" className="pl-9" /></div>
        <Button variant="outline" onClick={handleExport} disabled={!filteredServices.length}><Download className="mr-2 h-4 w-4" />Exportar</Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        {loading ? <div className="space-y-3 p-4">{[1,2,3,4,5].map(item => <Skeleton key={item} className="h-12 w-full" />)}</div>
        : filteredServices.length === 0 ? <EmptyState icon={searchTerm ? Search : ClipboardList} title={searchTerm ? "Nenhum JBR encontrado" : "Nenhum JBR cadastrado"} description={searchTerm ? "Revise o termo pesquisado." : "Crie o primeiro JBR para iniciar a operação."} actionLabel="Criar JBR" onAction={() => navigate("/novo-servico")} />
        : <Table>
          <TableHeader><TableRow><TableHead>JBR</TableHead><TableHead>Cliente</TableHead><TableHead>Local</TableHead><TableHead>Escopo</TableHead><TableHead className="text-center">Checklists</TableHead><TableHead>Fase</TableHead><TableHead>Período</TableHead><TableHead className="w-12"><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
          <TableBody>{filteredServices.map(service => <TableRow key={service.id} className="cursor-pointer" onClick={() => navigate(`/servico/${service.id}/timeline`)}>
            <TableCell className="whitespace-nowrap font-medium">{service.codigo_jbr}</TableCell>
            <TableCell>{service.cliente}</TableCell>
            <TableCell className="max-w-40 truncate text-muted-foreground">{service.local || "—"}</TableCell>
            <TableCell className="max-w-56"><p className="truncate text-sm">{service.escopo?.join(", ") || "—"}</p></TableCell>
            <TableCell className="text-center">{service.checklists_count || 0}</TableCell>
            <TableCell><Badge variant={service.operational_status === "completed" ? "default" : "secondary"}>{getServicePhase(service.operational_status).label}</Badge></TableCell>
            <TableCell className="whitespace-nowrap text-sm">{date(service.data_inicio)} — {date(service.data_termino)}</TableCell>
            <TableCell onClick={event => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ações do JBR ${service.codigo_jbr}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => navigate(`/editar-servico/${service.id}`)}><Pencil className="mr-2 h-4 w-4" />Editar JBR</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
      </div>
      {!loading && filteredServices.length > 0 && <p className="text-xs text-muted-foreground">{filteredServices.length} JBR{filteredServices.length === 1 ? "" : "s"}</p>}
    </main>
  </div>;
};

export default Servicos;
