import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DamageType {
  type: string;
  severity: number;
  location: string;
  description: string;
}

interface AnalysisResult {
  damageTypes: DamageType[];
  overallSeverity: number;
  overallAssessment: string;
  recommendations: string[];
  suggestedAction: 'continue' | 'monitor' | 'replace';
  confidence: number;
}

interface CableImageAnalyzerProps {
  imagePreview: string;
  onAnalysisComplete?: (analysis: AnalysisResult) => void;
}

export const CableImageAnalyzer = ({ imagePreview, onAnalysisComplete }: CableImageAnalyzerProps) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const analyzeImage = async () => {
    try {
      setAnalyzing(true);
      toast.info("Analisando imagem com IA...", { duration: 2000 });

      const { data, error } = await supabase.functions.invoke('analyze-cable-image', {
        body: { imageBase64: imagePreview }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro na análise');
      }

      setAnalysis(data.analysis);
      onAnalysisComplete?.(data.analysis);
      toast.success("Análise concluída com sucesso!");

    } catch (error) {
      console.error('Erro ao analisar imagem:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao analisar a imagem');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 30) return "text-green-600 dark:text-green-400";
    if (severity <= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getSeverityBadge = (severity: number) => {
    if (severity <= 30) return { variant: "default" as const, icon: CheckCircle, label: "Leve" };
    if (severity <= 60) return { variant: "secondary" as const, icon: AlertTriangle, label: "Moderado" };
    return { variant: "destructive" as const, icon: AlertCircle, label: "Severo" };
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'continue':
        return { variant: "default" as const, label: "Continuar operação" };
      case 'monitor':
        return { variant: "secondary" as const, label: "Monitorar" };
      case 'replace':
        return { variant: "destructive" as const, label: "Substituir" };
      default:
        return { variant: "outline" as const, label: action };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Button 
          onClick={analyzeImage} 
          disabled={analyzing || !imagePreview}
          className="gap-2"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Analisar com IA
            </>
          )}
        </Button>
      </div>

      {analysis && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Resultado da Análise
              </span>
              <Badge variant="outline" className="text-xs">
                Confiança: {analysis.confidence}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Severity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Severidade Geral</span>
                <div className="flex items-center gap-2">
                  {(() => {
                    const badge = getSeverityBadge(analysis.overallSeverity);
                    const Icon = badge.icon;
                    return (
                      <>
                        <Icon className={`h-4 w-4 ${getSeverityColor(analysis.overallSeverity)}`} />
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className={`text-lg font-bold ${getSeverityColor(analysis.overallSeverity)}`}>
                          {analysis.overallSeverity}%
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.overallAssessment}</p>
            </div>

            {/* Suggested Action */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Ação Sugerida</span>
              <Badge variant={getActionBadge(analysis.suggestedAction).variant}>
                {getActionBadge(analysis.suggestedAction).label}
              </Badge>
            </div>

            {/* Damage Types */}
            {analysis.damageTypes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Danos Identificados</h4>
                <div className="space-y-3">
                  {analysis.damageTypes.map((damage, index) => (
                    <Card key={index} className="p-3 bg-muted/50">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{damage.type}</span>
                          <Badge 
                            variant={getSeverityBadge(damage.severity).variant}
                            className="text-xs"
                          >
                            {damage.severity}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Local:</span> {damage.location}
                        </p>
                        <p className="text-xs text-muted-foreground">{damage.description}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Recomendações</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
