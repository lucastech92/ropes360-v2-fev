import { useRef, useState } from "react";
import { Brain, Download, FileCheck2, FileText, Loader2, Upload, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServiceDocuments, type ServiceDocument, type ServiceDocumentType, type ReviewResult } from "@/hooks/useServiceDocuments";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { buildRopeReviewContext, filterUnsupportedSuggestions, ROPE360_ISO4309_PROFILE, runRopeDocumentPreChecks, type RopeReviewFinding } from "@/lib/ropeReviewProfile";
import { useDocumentReviewFeedback } from "@/hooks/useDocumentReviewFeedback";

interface ServiceDocumentCenterProps {
  serviceId: string;
  client: string;
  scope: string[];
}

const typeLabel: Record<ServiceDocumentType, string> = {
  report: "Relatório de inspeção",
  certificate: "Certificado",
  photo: "Foto técnica",
  other: "Outro anexo",
};

const reviewLabel: Record<string, string> = {
  uploaded: "Aguardando revisão",
  reviewing: "Em revisão",
  reviewed: "Revisado",
  review_failed: "Revisão pendente",
};

const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const ServiceDocumentCenter = ({ serviceId, client, scope }: ServiceDocumentCenterProps) => {
  const { documents, loading, uploadDocument, downloadDocument, setReviewState } = useServiceDocuments(serviceId);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<ServiceDocumentType>("report");
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const selectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    if (selected && !title) setTitle(selected.name);
  };

  const upload = async () => {
    if (!file) {
      toast({ title: "Selecione um arquivo", variant: "destructive" });
      return;
    }
    setUploading(true);
    const { error } = await uploadDocument(file, documentType, title);
    setUploading(false);
    if (error) {
      toast({ title: "Falha no upload", description: error.message, variant: "destructive" });
      return;
    }
    setFile(null);
    setTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast({ title: "Documento vinculado ao JBR" });
  };

  const openDocument = async (document: ServiceDocument) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(document.file_path, 60);
    if (error || !data) {
      toast({ title: "Não foi possível abrir o arquivo", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const extractForReview = async (file: File) => {
    if (file.type === "application/pdf") {
      return { fileBase64: await fileToBase64(file), fileContent: undefined };
    }
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return { fileBase64: undefined, fileContent: result.value };
    }
    if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const fileContent = workbook.SheetNames
        .map((sheetName) => `=== ${sheetName} ===\n${XLSX.utils.sheet_to_txt(workbook.Sheets[sheetName])}`)
        .join("\n\n");
      return { fileBase64: undefined, fileContent };
    }
    throw new Error("A revisão por IA aceita PDF, Word (.docx) ou Excel (.xlsx).");
  };

  const review = async (document: ServiceDocument) => {
    setReviewingId(document.id);
    await setReviewState(document.id, { review_status: "reviewing", review_error: null });
    try {
      const downloaded = await downloadDocument(document);
      if (downloaded.error || !downloaded.file) throw downloaded.error ?? new Error("Arquivo não encontrado");
      const { fileBase64, fileContent } = await extractForReview(downloaded.file);
      const localFindings: RopeReviewFinding[] = fileContent
        ? runRopeDocumentPreChecks(fileContent, document.original_file_name)
        : [];
      const { data, error } = await supabase.functions.invoke("analyze-report", {
        body: {
          fileBase64,
          fileContent: fileContent ? buildRopeReviewContext(fileContent) : fileContent,
          fileName: document.original_file_name,
          scopeType: "ISO 4309 — Ropes360",
          client,
          profileContext: ROPE360_ISO4309_PROFILE,
        },
      });
      if (error) throw error;
      const analysis = data?.analysis as ReviewResult | undefined;
      if (!analysis) throw new Error("A IA não retornou um parecer estruturado.");
      const cleanedAnalysis: ReviewResult = {
        ...analysis,
        improvements: filterUnsupportedSuggestions(analysis.improvements, fileContent || ""),
      };
      const mergedAnalysis: ReviewResult = {
        ...cleanedAnalysis,
        review_findings: [...localFindings, ...(analysis.review_findings ?? [])],
      };
      const { error: saveError } = await setReviewState(document.id, {
        review_status: "reviewed",
        review_score: mergedAnalysis.quality_score ?? null,
        review_result: mergedAnalysis,
        review_error: null,
        reviewed_at: new Date().toISOString(),
      });
      if (saveError) throw saveError;
      toast({ title: "Revisão técnica concluída", description: "O arquivo original não foi alterado." });
    } catch (error: any) {
      await setReviewState(document.id, {
        review_status: "review_failed",
        review_error: error.message ?? "Não foi possível concluir a revisão.",
      });
      toast({ title: "Revisão não concluída", description: error.message, variant: "destructive" });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><FileCheck2 className="h-5 w-5" /> Documentação e revisão técnica</CardTitle>
        <CardDescription>O arquivo original é preservado. A IA emite apenas um parecer e sugestões de conferência.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_1fr_auto]">
          <div className="space-y-1.5"><Label>Arquivo</Label><Input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={selectFile} /></div>
          <div className="space-y-1.5"><Label>Tipo</Label><Select value={documentType} onValueChange={(value) => setDocumentType(value as ServiceDocumentType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Título</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Relatório final Main Hoist" /></div>
          <Button className="self-end" onClick={upload} disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="mr-2 h-4 w-4" />Enviar</>}</Button>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Carregando documentos...</p> : documents.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhum documento técnico vinculado a este JBR.</p>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <DocumentRow key={document.id} document={document} reviewing={reviewingId === document.id} onOpen={() => openDocument(document)} onReview={() => review(document)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DocumentRow = ({ document, reviewing, onOpen, onReview }: { document: ServiceDocument; reviewing: boolean; onOpen: () => void; onReview: () => void }) => {
  const result = document.review_result as ReviewResult | null;
  const { feedback, submitFeedback } = useDocumentReviewFeedback(document.id);
  const supportsReview = document.mime_type === "application/pdf"
    || document.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || document.mime_type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><p className="font-medium">{document.title}</p><Badge variant="outline">{typeLabel[document.document_type]}</Badge><Badge variant={document.review_status === "reviewed" ? "secondary" : "outline"}>{reviewLabel[document.review_status]}</Badge></div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{document.original_file_name}{document.review_score !== null && ` · Score: ${Math.round(document.review_score)}/100`}</p>
        </div>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={onOpen}><Download className="mr-2 h-4 w-4" />Abrir</Button>{supportsReview && <Button size="sm" onClick={onReview} disabled={reviewing}>{reviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}{reviewing ? "Revisando..." : "Revisar com IA"}</Button>}</div>
      </div>
      {document.review_error && <p className="mt-3 flex items-center gap-2 text-sm text-destructive"><XCircle className="h-4 w-4" />{document.review_error}</p>}
      {result && (
        <div className="mt-4 rounded-md bg-muted/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Parecer da revisão</p>
            {result.review_outcome && <Badge variant={result.review_outcome === "remove_from_service" ? "destructive" : "outline"}>{({ routine_normal: "Rotina normal", reinforced_monitoring: "Monitoramento reforçado", corrective_action: "Ação corretiva", remove_from_service: "Retirar de serviço" } as const)[result.review_outcome]}</Badge>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{result.review_findings?.length ? `Foram encontrados ${result.review_findings.length} pontos para conferência. Consulte abaixo a evidência e a ação recomendada.` : "Nenhuma inconsistência sustentada por evidência foi identificada."}</p>
        </div>
      )}
      {result?.review_findings && result.review_findings.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Achados com evidência</p>
          {result.review_findings.map((finding, index) => (
            <div key={index} className="rounded-md border p-3 text-sm">
              <div className="flex items-center gap-2"><Badge variant={finding.priority === "critical" ? "destructive" : "outline"}>{finding.priority === "critical" ? "Crítico" : finding.priority === "info" ? "Informativo" : "Revisar"}</Badge><span className="font-medium">{({ document_control: "Controle documental", technical_consistency: "Consistência técnica", inspection_scope: "Escopo da inspeção", normative_compliance: "Conformidade normativa", completeness: "Completude" } as Record<string, string>)[finding.category] ?? finding.category}</span></div>
              <p className="mt-2"><span className="font-medium">Evidência: </span>{finding.evidence}</p>
              <p className="mt-1 text-muted-foreground"><span className="font-medium text-foreground">Ação recomendada: </span>{finding.recommendation}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["confirmed", "Correto"],
                  ["irrelevant", "Irrelevante"],
                  ["adjust_rule", "Ajustar regra"],
                ].map(([value, label]) => {
                  const key = [finding.priority, finding.category, finding.evidence].join("|");
                  const active = feedback[key] === value;
                  return <Button key={value} size="sm" variant={active ? "default" : "outline"} onClick={() => submitFeedback(key, value as "confirmed" | "irrelevant" | "adjust_rule")}>{label}</Button>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {result?.strengths && result.strengths.length > 0 && <details className="mt-4 rounded-md border p-3"><summary className="cursor-pointer text-sm font-medium">Pontos fortes do documento</summary><ul className="mt-2 list-inside list-disc text-sm">{result.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
      {result?.improvements && result.improvements.length > 0 && <details className="mt-3 rounded-md border p-3"><summary className="cursor-pointer text-sm font-medium">Melhorias complementares</summary><ul className="mt-2 list-inside list-disc text-sm">{result.improvements.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
      {result?.limitations && result.limitations.length > 0 && <div className="mt-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground"><span className="font-medium text-foreground">Limitações da análise: </span>{result.limitations.join(" ")}</div>}
    </div>
  );
};
