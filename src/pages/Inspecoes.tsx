import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";

const Inspecoes = () => {
  const checklistVisual = [
    "Verificar arames rompidos visíveis",
    "Identificar desgaste por abrasão",
    "Avaliar corrosão externa e interna",
    "Verificar amassamentos e dobras",
    "Inspecionar soquetes e terminações",
    "Documentar com fotografias"
  ];

  const checklistEletromag = [
    "Calibrar equipamento INTROS em trecho real",
    "Definir baseline de referência",
    "Realizar varredura completa do cabo",
    "Identificar anomalias LMA (perda de área metálica)",
    "Identificar anomalias LF (defeitos localizados)",
    "Gerar relatório automatizado"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold">Inspeções Visual e Eletromagnética</h1>
          <p className="text-muted-foreground">
            Guias completos e checklists para inspeções de cabos de aço em campo.
          </p>
        </div>

        <Tabs defaultValue="visual" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="visual">Inspeção Visual</TabsTrigger>
            <TabsTrigger value="eletromag">Inspeção Eletromagnética</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Checklist de Inspeção Visual</CardTitle>
                <CardDescription>
                  Procedimento padrão para inspeção visual de cabos de aço conforme ISO 4309
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {checklistVisual.map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Critérios de Descarte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-2 font-semibold">Arames Rompidos:</h4>
                  <p className="text-muted-foreground">
                    Descarte obrigatório quando houver mais de 6 arames rompidos em um comprimento de 6 diâmetros,
                    ou 3 arames rompidos em um único passo da torção.
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold">Redução de Diâmetro:</h4>
                  <p className="text-muted-foreground">
                    Descarte quando a redução nominal do diâmetro do cabo exceder 7% do diâmetro original.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="eletromag" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Checklist de Inspeção Eletromagnética</CardTitle>
                <CardDescription>
                  Procedimento para inspeção com equipamento INTROS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {checklistEletromag.map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Como Calibrar o INTROS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-2 font-semibold">1. Seleção do Trecho:</h4>
                  <p className="text-muted-foreground">
                    Escolha um trecho de cabo em boas condições, livre de defeitos visíveis, com pelo menos 3 metros de comprimento.
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold">2. Configuração:</h4>
                  <p className="text-muted-foreground">
                    Configure o diâmetro nominal do cabo no equipamento. Realize 3 passadas completas no trecho selecionado.
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold">3. Baseline:</h4>
                  <p className="text-muted-foreground">
                    O equipamento calculará a linha de base (baseline) que será a referência para toda a inspeção.
                    Qualquer anomalia será comparada a esta referência.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Inspecoes;
