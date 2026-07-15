import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ServiceDocumentType = "report" | "certificate" | "photo" | "other";
export type ReviewStatus = "uploaded" | "reviewing" | "reviewed" | "review_failed";

export interface ReviewResult {
  quality_score?: number;
  strengths?: string[];
  improvements?: string[];
  extracted_data?: Record<string, unknown>;
  comparison?: { average_score: number | null; total_reports_analyzed: number };
  review_outcome?: "routine_normal" | "reinforced_monitoring" | "corrective_action" | "remove_from_service";
  limitations?: string[];
  review_findings?: Array<{
    priority: "critical" | "review" | "info";
    category: string;
    evidence: string;
    recommendation: string;
  }>;
}

export interface ServiceDocument {
  id: string;
  service_id: string;
  document_type: ServiceDocumentType;
  title: string;
  original_file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  review_status: ReviewStatus;
  review_score: number | null;
  review_result: ReviewResult | null;
  review_error: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const useServiceDocuments = (serviceId: string | undefined) => {
  const [documents, setDocuments] = useState<ServiceDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!serviceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("service_documents")
      .select("*")
      .eq("service_id", serviceId)
      .order("uploaded_at", { ascending: false });
    if (!error) setDocuments((data ?? []) as ServiceDocument[]);
    setLoading(false);
  }, [serviceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const uploadDocument = async (file: File, type: ServiceDocumentType, title: string) => {
    if (!serviceId) return { error: new Error("JBR não informado") };
    if (file.size > MAX_FILE_SIZE) return { error: new Error("O arquivo excede o limite de 20 MB") };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Usuário não autenticado") };

    const extension = file.name.split(".").pop() || "file";
    const safeName = `${crypto.randomUUID()}.${extension}`;
    const filePath = `jbr/${serviceId}/${safeName}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) return { error: uploadError };

    const { error: insertError } = await supabase.from("service_documents").insert({
      service_id: serviceId,
      document_type: type,
      title: title.trim() || file.name,
      original_file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: user.id,
    });

    if (insertError) {
      await supabase.storage.from("documents").remove([filePath]);
      return { error: insertError };
    }
    await refresh();
    return { error: null };
  };

  const downloadDocument = async (document: ServiceDocument) => {
    const { data, error } = await supabase.storage.from("documents").download(document.file_path);
    if (error || !data) return { error: error ?? new Error("Arquivo não encontrado"), file: null };
    return {
      error: null,
      file: new File([data], document.original_file_name, { type: document.mime_type || data.type }),
    };
  };

  const setReviewState = async (documentId: string, values: Record<string, unknown>) => {
    const { error } = await supabase.from("service_documents").update(values as never).eq("id", documentId);
    if (!error) await refresh();
    return { error };
  };

  return { documents, loading, uploadDocument, downloadDocument, setReviewState };
};
