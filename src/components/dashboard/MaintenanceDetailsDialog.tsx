import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MaintenanceTimeline } from "./MaintenanceTimeline";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface MaintenanceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenanceRecords: any[];
}

export const MaintenanceDetailsDialog = ({
  open,
  onOpenChange,
  maintenanceRecords,
}: MaintenanceDetailsDialogProps) => {
  const pending = maintenanceRecords.filter((m) => m.status === "pendente");
  const inProgress = maintenanceRecords.filter((m) => m.status === "em andamento");
  const completed = maintenanceRecords.filter((m) => m.status === "concluído");

  const completionRate =
    maintenanceRecords.length > 0
      ? (completed.length / maintenanceRecords.length) * 100
      : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">Pendente</Badge>;
      case "em andamento":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">Em Andamento</Badge>;
      case "concluído":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Concluído</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "alta":
        return <Badge variant="destructive">Alta</Badge>;
      case "média":
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-700">Média</Badge>;
      case "baixa":
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Análise de Manutenção</DialogTitle>
          <DialogDescription>
            Estatísticas detalhadas e histórico de manutenções
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{maintenanceRecords.length}</div>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-yellow-700">Pendente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-700">{pending.length}</div>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-700">Em Andamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700">{inProgress.length}</div>
                </CardContent>
              </Card>

              <Card className="border-green-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-700">Concluído</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">{completed.length}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Taxa de Conclusão</CardTitle>
                <CardDescription>Percentual de manutenções concluídas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progresso Geral</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(completionRate)}%
                    </span>
                  </div>
                  <Progress value={completionRate} className="h-3" />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-yellow-700">{pending.length}</div>
                    <div className="text-xs text-muted-foreground">A fazer</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-blue-700">{inProgress.length}</div>
                    <div className="text-xs text-muted-foreground">Fazendo</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-green-700">{completed.length}</div>
                    <div className="text-xs text-muted-foreground">Feito</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolução Temporal</CardTitle>
                <CardDescription>
                  Histórico de manutenções nos últimos 6 meses por status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceTimeline maintenanceRecords={maintenanceRecords} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manutenções Detalhadas</CardTitle>
                <CardDescription>Lista completa com status e prioridade</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Agendado</TableHead>
                      <TableHead>Técnico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceRecords.slice(0, 20).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.equipment_name}</TableCell>
                        <TableCell className="capitalize">{record.maintenance_type}</TableCell>
                        <TableCell>{getPriorityBadge(record.priority)}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {record.scheduled_date
                            ? new Date(record.scheduled_date).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell>{record.technician}</TableCell>
                      </TableRow>
                    ))}
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

