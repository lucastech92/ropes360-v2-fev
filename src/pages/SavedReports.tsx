import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Search, Pencil, Trash2, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";

interface InspectionReport {
  id: string;
  report_number: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const SavedReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<InspectionReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const filtered = reports.filter(report =>
      report.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredReports(filtered);
  }, [reports, searchTerm]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("inspection_reports")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os relatórios salvos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteReport = async () => {
    if (!deleteReportId) return;

    try {
      const { error } = await supabase
        .from("inspection_reports")
        .delete()
        .eq("id", deleteReportId);

      if (error) throw error;

      toast({
        title: "Relatório excluído",
        description: "O relatório foi removido com sucesso",
      });

      setReports(reports.filter(r => r.id !== deleteReportId));
      setDeleteReportId(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o relatório",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Concluído
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Rascunho
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Relatórios Salvos
          </h1>
          <p className="text-muted-foreground">
            Acesse e edite seus relatórios de inspeção salvos
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Relatórios de Inspeção</CardTitle>
                <CardDescription>
                  Todos os relatórios salvos e rascunhos
                </CardDescription>
              </div>
              <Button onClick={() => navigate("/wire-rope-inspection")}>
                <FileText className="h-4 w-4 mr-2" />
                Novo Relatório
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número ou título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando relatórios...
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "Nenhum relatório encontrado" : "Nenhum relatório salvo ainda"}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Relatório</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Última Atualização</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.report_number}
                        </TableCell>
                        <TableCell>{report.title || 'Sem título'}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          {format(new Date(report.updated_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(report.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/wire-rope-inspection?id=${report.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteReportId(report.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteReportId} onOpenChange={(open) => !open && setDeleteReportId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteReport} className="bg-destructive hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default SavedReports;
