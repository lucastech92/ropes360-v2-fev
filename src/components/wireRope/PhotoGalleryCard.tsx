import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { CableImageAnalyzer } from "@/components/CableImageAnalyzer";
import { PhotoEntry } from "@/hooks/useWireRopeReport";

interface PhotoGalleryCardProps {
  photos: PhotoEntry[];
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (id: string) => void;
  onUpdateCaption: (id: string, caption: string) => void;
}

export const PhotoGalleryCard = ({
  photos,
  onPhotoUpload,
  onRemovePhoto,
  onUpdateCaption,
}: PhotoGalleryCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fotos e Observações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Upload de Fotos</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={onPhotoUpload}
            className="mt-2"
          />
        </div>
        <div className="grid gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="p-4">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[200px,1fr,auto]">
                  <img src={photo.preview} alt="Inspection" className="rounded-lg object-cover h-32 w-full" />
                  <div className="space-y-2">
                    <Label>Legenda</Label>
                    <Textarea
                      value={photo.caption}
                      onChange={(e) => onUpdateCaption(photo.id, e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onRemovePhoto(photo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CableImageAnalyzer 
                  imagePreview={photo.preview}
                  onAnalysisComplete={(analysis) => {
                    if (analysis.damageTypes.length > 0) {
                      const firstDamage = analysis.damageTypes[0];
                      const autoCaption = `${firstDamage.type} - Severidade: ${firstDamage.severity}% - ${firstDamage.location}`;
                      onUpdateCaption(photo.id, autoCaption);
                    }
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
