import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Folder, User, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentList } from "@/components/DocumentList";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  name: string;
  folder_id: string;
}

const DuvidasFrequentes = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employee_folders")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os colaboradores.",
        variant: "destructive",
      });
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const createEmployee = async () => {
    if (!newEmployeeName.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o colaborador.",
        variant: "destructive",
      });
      return;
    }

    const folderId = newEmployeeName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { error } = await supabase
      .from("employee_folders")
      .insert({ name: newEmployeeName.trim(), folder_id: folderId });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o colaborador.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Colaborador criado com sucesso.",
      });
      setNewEmployeeName("");
      setDialogOpen(false);
      fetchEmployees();
    }
  };

  const deleteEmployee = async (employeeId: string, folderId: string) => {
    if (!confirm("Tem certeza que deseja excluir este colaborador? Todos os documentos associados também serão excluídos.")) {
      return;
    }

    // First delete all documents for this employee
    const { error: docsError } = await supabase
      .from("documents")
      .delete()
      .eq("employee_folder", folderId);

    if (docsError) {
      toast({
        title: "Erro",
        description: "Erro ao excluir documentos do colaborador.",
        variant: "destructive",
      });
      return;
    }

    // Then delete the employee folder
    const { error } = await supabase
      .from("employee_folders")
      .delete()
      .eq("id", employeeId);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir colaborador.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Colaborador excluído com sucesso.",
      });
      fetchEmployees();
    }
  };

  if (selectedEmployee) {
    const employee = employees.find(e => e.folder_id === selectedEmployee);
    
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <button 
            onClick={() => setSelectedEmployee(null)}
            className="mb-6 text-primary hover:underline flex items-center gap-2"
          >
            ← Voltar para Colaboradores
          </button>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <User className="h-8 w-8" />
              {employee?.name}
            </h1>
            <p className="text-muted-foreground">
              Certificados e documentos pessoais
            </p>
          </div>

          <Tabs defaultValue="documents" className="space-y-6">
            <TabsList>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-4">
              <DocumentList 
                category="duvidas_frequentes" 
                refreshTrigger={refreshTrigger}
                employeeFolder={selectedEmployee}
              />
            </TabsContent>

            <TabsContent value="upload">
              <DocumentUpload 
                category="duvidas_frequentes"
                employeeFolder={selectedEmployee}
                onUploadComplete={() => setRefreshTrigger(prev => prev + 1)}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Documentação da Equipe</h1>
            <p className="text-muted-foreground">
              Selecione um colaborador para gerenciar certificados e documentos pessoais
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Pasta de Colaborador</DialogTitle>
                <DialogDescription>
                  Digite o nome do colaborador para criar uma nova pasta.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Nome do Colaborador</Label>
                  <Input
                    id="name"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    placeholder="Ex: João Silva"
                    onKeyDown={(e) => e.key === "Enter" && createEmployee()}
                  />
                </div>
                <Button onClick={createEmployee} className="w-full">
                  Criar Pasta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {employees.map((employee) => (
              <Card 
                key={employee.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEmployee(employee.id, employee.folder_id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div onClick={() => setSelectedEmployee(employee.folder_id)}>
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Folder className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{employee.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Certificados, documentos pessoais e registros
                    </CardDescription>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DuvidasFrequentes;
