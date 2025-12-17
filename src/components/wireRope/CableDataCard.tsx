import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CableDataCardProps {
  application: string;
  manufacturer: string;
  installationDate: string;
  manufacturingDate: string;
  originalCertificate: string;
  construction: string;
  nominalDiameter: string;
  referenceDiameter: string;
  measuredDiameter: string;
  originalLength: string;
  onApplicationChange: (value: string) => void;
  onManufacturerChange: (value: string) => void;
  onInstallationDateChange: (value: string) => void;
  onManufacturingDateChange: (value: string) => void;
  onOriginalCertificateChange: (value: string) => void;
  onConstructionChange: (value: string) => void;
  onNominalDiameterChange: (value: string) => void;
  onReferenceDiameterChange: (value: string) => void;
  onMeasuredDiameterChange: (value: string) => void;
  onOriginalLengthChange: (value: string) => void;
}

export const CableDataCard = ({
  application,
  manufacturer,
  installationDate,
  manufacturingDate,
  originalCertificate,
  construction,
  nominalDiameter,
  referenceDiameter,
  measuredDiameter,
  originalLength,
  onApplicationChange,
  onManufacturerChange,
  onInstallationDateChange,
  onManufacturingDateChange,
  onOriginalCertificateChange,
  onConstructionChange,
  onNominalDiameterChange,
  onReferenceDiameterChange,
  onMeasuredDiameterChange,
  onOriginalLengthChange,
}: CableDataCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do Cabo de Aço</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="application">Aplicação</Label>
          <Input
            id="application"
            value={application}
            onChange={(e) => onApplicationChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manufacturer">Fabricante</Label>
          <Input
            id="manufacturer"
            value={manufacturer}
            onChange={(e) => onManufacturerChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="installationDate">Data da Instalação</Label>
          <Input
            id="installationDate"
            type="date"
            value={installationDate}
            onChange={(e) => onInstallationDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manufacturingDate">Data de Fabricação</Label>
          <Input
            id="manufacturingDate"
            type="date"
            value={manufacturingDate}
            onChange={(e) => onManufacturingDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="originalCertificate">Certificado Original</Label>
          <Input
            id="originalCertificate"
            value={originalCertificate}
            onChange={(e) => onOriginalCertificateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="construction">Construção</Label>
          <Input
            id="construction"
            value={construction}
            onChange={(e) => onConstructionChange(e.target.value)}
            placeholder="Ex: 39(W)xK7-WSC"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nominalDiameter">Diâmetro Nominal (mm)</Label>
          <Input
            id="nominalDiameter"
            type="number"
            step="0.01"
            value={nominalDiameter}
            onChange={(e) => onNominalDiameterChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceDiameter">Diâmetro de Referência (mm)</Label>
          <Input
            id="referenceDiameter"
            type="number"
            step="0.01"
            value={referenceDiameter}
            onChange={(e) => onReferenceDiameterChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="measuredDiameter">Diâmetro Medido em Campo (mm)</Label>
          <Input
            id="measuredDiameter"
            type="number"
            step="0.01"
            value={measuredDiameter}
            onChange={(e) => onMeasuredDiameterChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="originalLength">Comprimento Original do Cabo (m)</Label>
          <Input
            id="originalLength"
            type="number"
            value={originalLength}
            onChange={(e) => onOriginalLengthChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
