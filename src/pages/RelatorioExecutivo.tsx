import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { NavigationBreadcrumb } from "@/components/NavigationBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Sparkles, Download, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const REPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/executive-report`;

const RelatorioExecutivo = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [report, setReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generateReport = async () => {
    if (isGenerating) {
      abortRef.current?.abort();
      setIsGenerating(false);
      return;
    }

    setReport("");
    setIsGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(REPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ period }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro ao gerar relatório" }));
        toast.error(err.error || "Erro ao gerar relatório");
        setIsGenerating(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setReport(accumulated);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush remaining
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setReport(accumulated);
            }
          } catch { /* ignore */ }
        }
      }

      toast.success("Relatório gerado com sucesso!");
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error(e);
        toast.error("Erro ao gerar relatório");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-executivo-${period}-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <NavigationBreadcrumb />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Relatório Executivo
          </h1>
          <p className="text-muted-foreground">
            Resumo operacional gerado por IA com recomendações estratégicas para diretoria
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Configurações do Relatório
            </CardTitle>
            <CardDescription>
              Selecione o período e gere o relatório automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium text-foreground">Período</label>
                <Select value={period} onValueChange={(v) => setPeriod(v as "weekly" | "monthly")}>
                  <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Semanal (últimos 7 dias)
                      </div>
                    </SelectItem>
                    <SelectItem value="monthly">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Mensal (últimos 30 dias)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button onClick={generateReport} size="lg" variant={isGenerating ? "destructive" : "default"}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelar
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar Relatório
                    </>
                  )}
                </Button>

                {report && !isGenerating && (
                  <Button variant="outline" size="lg" onClick={exportReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar .md
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Output */}
        {(report || isGenerating) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatório — {period === "weekly" ? "Semanal" : "Mensal"}
                </CardTitle>
                <Badge variant={isGenerating ? "secondary" : "default"}>
                  {isGenerating ? "Gerando..." : "Concluído"}
                </Badge>
              </div>
              <CardDescription>
                Gerado em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{report || "Aguardando dados..."}</ReactMarkdown>
              </div>
              {isGenerating && (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando dados e gerando recomendações...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!report && !isGenerating && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum relatório gerado
              </h3>
              <p className="text-muted-foreground max-w-md">
                Selecione o período desejado e clique em "Gerar Relatório" para criar um resumo executivo completo com recomendações estratégicas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RelatorioExecutivo;

