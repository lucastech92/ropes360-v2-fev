import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InspectionEquipmentCardProps {
  magneticHead: string;
  magneticHeadSerial: string;
  sensorUsed: string;
  dataLoggerSerial: string;
  onMagneticHeadChange: (value: string) => void;
  onMagneticHeadSerialChange: (value: string) => void;
  onSensorUsedChange: (value: string) => void;
  onDataLoggerSerialChange: (value: string) => void;
}

export const InspectionEquipmentCard = ({
  magneticHead,
  magneticHeadSerial,
  sensorUsed,
  dataLoggerSerial,
  onMagneticHeadChange,
  onMagneticHeadSerialChange,
  onSensorUsedChange,
  onDataLoggerSerialChange,
}: InspectionEquipmentCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipamento de Inspeção</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="magneticHead">Cabeça Magnética</Label>
          <Input
            id="magneticHead"
            value={magneticHead}
            onChange={(e) => onMagneticHeadChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="magneticHeadSerial">Nº Série Cabeça Magnética</Label>
          <Input
            id="magneticHeadSerial"
            value={magneticHeadSerial}
            onChange={(e) => onMagneticHeadSerialChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sensorUsed">Sensor Utilizado</Label>
          <Input
            id="sensorUsed"
            value={sensorUsed}
            onChange={(e) => onSensorUsedChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataLoggerSerial">Nº Série Unidade de Dados</Label>
          <Input
            id="dataLoggerSerial"
            value={dataLoggerSerial}
            onChange={(e) => onDataLoggerSerialChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

