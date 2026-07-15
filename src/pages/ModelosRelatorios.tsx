import { useState } from "react";
import Header from "@/components/Header";
import { FileText } from "lucide-react";
import { InspectionPackageForm } from "@/components/inspectionPackages/InspectionPackageForm";
import { InspectionPackageList } from "@/components/inspectionPackages/InspectionPackageList";

const ModelosRelatorios = () => {
  const [packageRefresh, setPackageRefresh] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Modelos e Relatórios
          </h1>
          <p className="text-muted-foreground">
            Pacotes de inspeção: agrupe certificado, arquivo SLB/MRT e demais documentos.
          </p>
        </div>

        <div className="space-y-6">
          <InspectionPackageForm onCreated={() => setPackageRefresh((p) => p + 1)} />
          <div key={packageRefresh}>
            <InspectionPackageList />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ModelosRelatorios;

