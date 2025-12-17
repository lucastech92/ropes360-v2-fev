import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { MeasurementRow } from "@/hooks/useWireRopeReport";

interface MeasurementCardProps {
  measurement: MeasurementRow;
  onUpdate: (id: string, field: keyof MeasurementRow, value: string) => void;
  onRemove: (id: string) => void;
}

export const MeasurementCard = ({ measurement, onUpdate, onRemove }: MeasurementCardProps) => {
  return (
    <Card className="p-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Posição (m)</Label>
          <Input
            type="number"
            step="0.01"
            value={measurement.position}
            onChange={(e) => onUpdate(measurement.id, 'position', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Diâmetro 1 (mm)</Label>
          <Input
            type="number"
            step="0.01"
            value={measurement.diameter1}
            onChange={(e) => onUpdate(measurement.id, 'diameter1', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Diâmetro 2 (mm)</Label>
          <Input
            type="number"
            step="0.01"
            value={measurement.diameter2}
            onChange={(e) => onUpdate(measurement.id, 'diameter2', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Corrosão (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={measurement.corrosionSeverity}
            onChange={(e) => onUpdate(measurement.id, 'corrosionSeverity', e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Natureza do Dano</Label>
          <Input
            value={measurement.damageNature}
            onChange={(e) => onUpdate(measurement.id, 'damageNature', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Severidade Dano (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={measurement.damageSeverity}
            onChange={(e) => onUpdate(measurement.id, 'damageSeverity', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Arames Rompidos</Label>
          <Input
            value={measurement.brokenWires}
            onChange={(e) => onUpdate(measurement.id, 'brokenWires', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Severidade Arames (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={measurement.brokenWiresSeverity}
            onChange={(e) => onUpdate(measurement.id, 'brokenWiresSeverity', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Avaliação Geral (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={measurement.overallAssessment}
            onChange={(e) => onUpdate(measurement.id, 'overallAssessment', e.target.value)}
          />
        </div>
        <div className="flex items-end md:col-span-2">
          <Button
            variant="destructive"
            onClick={() => onRemove(measurement.id)}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </Button>
        </div>
      </div>
    </Card>
  );
};
