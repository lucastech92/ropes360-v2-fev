import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
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
            className="flex items-center gap-2"
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
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : services.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum serviço cadastrado ainda.
              </p>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
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
