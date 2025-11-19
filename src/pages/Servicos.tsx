import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Pencil, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  codigo_jbr: string;
  cliente: string;
  escopo: string[] | null;
  outros_escopo: string | null;
  aplicacao: string | null;
  equipamentos: string | null;
  data_inicio: string | null;
  data_termino: string | null;
}

const Servicos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Erro ao carregar serviços",
        description: "Não foi possível carregar a lista de serviços.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">JBR - Serviços</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie todos os serviços registrados
            </p>
          </div>
          <Button
            onClick={() => navigate("/novo-servico")}
            className="flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Novo Serviço
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Serviços</CardTitle>
            <CardDescription>
              Todos os serviços cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-12 w-24" />
                  </div>
                ))}
              </div>
            ) : services.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhum serviço cadastrado"
                description="Comece criando seu primeiro serviço JBR. Clique no botão 'Novo Serviço' para começar."
                actionLabel="Criar Primeiro Serviço"
                onAction={() => navigate("/novo-servico")}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código JBR</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Escopo</TableHead>
                    <TableHead>Aplicação</TableHead>
                    <TableHead>Equipamentos</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Data Término</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service, index) => (
                    <TableRow 
                      key={service.id}
                      className="animate-fade-in transition-all hover:bg-muted/50"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="font-medium">{service.codigo_jbr}</TableCell>
                      <TableCell>{service.cliente}</TableCell>
                      <TableCell>
                        {service.escopo && service.escopo.length > 0 ? (
                          <div className="space-y-1">
                            {service.escopo.map((esc, idx) => (
                              <div key={idx} className="text-sm">
                                {esc}
                                {esc === "Outros" && service.outros_escopo && (
                                  <span className="text-muted-foreground ml-1">
                                    ({service.outros_escopo})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {service.aplicacao || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {service.equipamentos || "-"}
                      </TableCell>
                      <TableCell>
                        {service.data_inicio
                          ? new Date(service.data_inicio).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {service.data_termino
                          ? new Date(service.data_termino).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/editar-servico/${service.id}`)}
                          className="transition-all hover:scale-110 active:scale-95"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Servicos;
