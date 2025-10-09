import { useState } from "react";
import Header from "@/components/Header";
import { Folder, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentList } from "@/components/DocumentList";

const employees = [
  { id: "lucas-carneiro", name: "Lucas Carneiro" },
  { id: "lucas-soares", name: "Lucas Soares" }
];

const DuvidasFrequentes = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (selectedEmployee) {
    const employee = employees.find(e => e.id === selectedEmployee);
    
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Documentação da Equipe</h1>
          <p className="text-muted-foreground">
            Selecione um colaborador para gerenciar certificados e documentos pessoais
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => (
            <Card 
              key={employee.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
              onClick={() => setSelectedEmployee(employee.id)}
            >
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
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DuvidasFrequentes;