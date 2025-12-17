import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";

interface MRTGraphsCardProps {
  lmaGraphPreview: string;
  lfGraphPreview: string;
  velocityGraphPreview: string;
  lmaObservations: string;
  lfObservations: string;
  onLmaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVelocityUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLmaObservationsChange: (value: string) => void;
  onLfObservationsChange: (value: string) => void;
}

export const MRTGraphsCard = ({
  lmaGraphPreview,
  lfGraphPreview,
  velocityGraphPreview,
  lmaObservations,
  lfObservations,
  onLmaUpload,
  onLfUpload,
  onVelocityUpload,
  onLmaObservationsChange,
  onLfObservationsChange,
}: MRTGraphsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gráficos MRT</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Gráfico LMA</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {lmaGraphPreview ? (
                <img src={lmaGraphPreview} alt="LMA Graph" className="max-h-40 mx-auto" />
              ) : (
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={onLmaUpload}
                className="mt-2"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gráfico LF</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {lfGraphPreview ? (
                <img src={lfGraphPreview} alt="LF Graph" className="max-h-40 mx-auto" />
              ) : (
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={onLfUpload}
                className="mt-2"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gráfico de Velocidade</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {velocityGraphPreview ? (
                <img src={velocityGraphPreview} alt="Velocity Graph" className="max-h-40 mx-auto" />
              ) : (
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={onVelocityUpload}
                className="mt-2"
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lmaObservations">Observações LMA</Label>
          <Textarea
            id="lmaObservations"
            value={lmaObservations}
            onChange={(e) => onLmaObservationsChange(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lfObservations">Observações LF</Label>
          <Textarea
            id="lfObservations"
            value={lfObservations}
            onChange={(e) => onLfObservationsChange(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
};
