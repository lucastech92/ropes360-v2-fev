import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServicesScopeChart } from "./ServicesScopeChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, Wrench } from "lucide-react";

interface ServicesDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: any[];
}

export const ServicesDetailsDialog = ({
  open,
  onOpenChange,
  services,
}: ServicesDetailsDialogProps) => {
  // Estatísticas
  const thisMonth = services.filter((s) => {
    if (!s.data_inicio) return false;
    const start = new Date(s.data_inicio);
    const now = new Date();
    return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
  });

  const activeServices = services.filter((s) => {
    if (!s.data_inicio) return true;
    if (!s.data_termino) return true;
    const now = new Date();
    const start = new Date(s.data_inicio);
    const end = new Date(s.data_termino);
    return now >= start && now <= end;
  });

  // Clientes únicos
  const uniqueClients = [...new Set(services.map((s) => s.cliente))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Análise Detalhada de Serviços JBR</DialogTitle>
          <DialogDescription>
            Estatísticas completas, distribuição por escopo e histórico
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="distribution">Distribuição</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Este Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{thisMonth.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">serviços iniciados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{activeServices.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">em andamento</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{uniqueClients.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">clientes únicos</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Clientes</CardTitle>
                <CardDescription>Clientes com mais serviços registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uniqueClients
                    .map((client) => ({
                      name: client,
                      count: services.filter((s) => s.cliente === client).length,
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map((client) => (
                      <div key={client.name} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{client.name}</span>
                        <Badge variant="secondary">{client.count} serviços</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo de Escopo</CardTitle>
                <CardDescription>
                  Visualização da distribuição percentual dos serviços por escopo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ServicesScopeChart services={services} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico Completo de Serviços</CardTitle>
                <CardDescription>Todos os serviços registrados no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código JBR</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Escopo</TableHead>
                      <TableHead>Data Início</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.slice(0, 20).map((service) => {
                      const isActive = (() => {
                        if (!service.data_inicio) return true;
                        if (!service.data_termino) return true;
                        const now = new Date();
                        const start = new Date(service.data_inicio);
                        const end = new Date(service.data_termino);
                        return now >= start && now <= end;
                      })();

                      return (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">{service.codigo_jbr}</TableCell>
                          <TableCell>{service.cliente}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {service.escopo?.slice(0, 2).map((esc: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {esc}
                                </Badge>
                              ))}
                              {service.escopo?.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{service.escopo.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {service.data_inicio
                              ? new Date(service.data_inicio).toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isActive ? "default" : "secondary"}>
                              {isActive ? "Ativo" : "Concluído"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

