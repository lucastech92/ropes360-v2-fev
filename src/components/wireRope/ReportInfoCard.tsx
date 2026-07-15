import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReportInfoCardProps {
  reportNumber: string;
  inspectionDate: string;
  inspector: string;
  client: string;
  location: string;
  jbr: string;
  onReportNumberChange: (value: string) => void;
  onInspectionDateChange: (value: string) => void;
  onInspectorChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onJbrChange: (value: string) => void;
}

export const ReportInfoCard = ({
  reportNumber,
  inspectionDate,
  inspector,
  client,
  location,
  jbr,
  onReportNumberChange,
  onInspectionDateChange,
  onInspectorChange,
  onClientChange,
  onLocationChange,
  onJbrChange,
}: ReportInfoCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Relatório</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reportNumber">Nº do Relatório</Label>
          <Input
            id="reportNumber"
            value={reportNumber}
            onChange={(e) => onReportNumberChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inspectionDate">Data da Inspeção</Label>
          <Input
            id="inspectionDate"
            type="date"
            value={inspectionDate}
            onChange={(e) => onInspectionDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inspector">Inspetor</Label>
          <Input
            id="inspector"
            value={inspector}
            onChange={(e) => onInspectorChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client">Cliente</Label>
          <Input
            id="client"
            value={client}
            onChange={(e) => onClientChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Local</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jbr">JBR</Label>
          <Input
            id="jbr"
            value={jbr}
            onChange={(e) => onJbrChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

