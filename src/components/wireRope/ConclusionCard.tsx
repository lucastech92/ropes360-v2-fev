import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ConclusionCardProps {
  conclusion: string;
  recommendations: string;
  conductedBy: string;
  approvedBy: string;
  onConclusionChange: (value: string) => void;
  onRecommendationsChange: (value: string) => void;
  onConductedByChange: (value: string) => void;
  onApprovedByChange: (value: string) => void;
}

export const ConclusionCard = ({
  conclusion,
  recommendations,
  conductedBy,
  approvedBy,
  onConclusionChange,
  onRecommendationsChange,
  onConductedByChange,
  onApprovedByChange,
}: ConclusionCardProps) => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Conclusão e Recomendações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conclusion">Conclusão</Label>
            <Textarea
              id="conclusion"
              value={conclusion}
              onChange={(e) => onConclusionChange(e.target.value)}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recommendations">Recomendações</Label>
            <Textarea
              id="recommendations"
              value={recommendations}
              onChange={(e) => onRecommendationsChange(e.target.value)}
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aprovação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="conductedBy">Conduzido Por</Label>
            <Input
              id="conductedBy"
              value={conductedBy}
              onChange={(e) => onConductedByChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="approvedBy">Aprovado Por</Label>
            <Input
              id="approvedBy"
              value={approvedBy}
              onChange={(e) => onApprovedByChange(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
};
