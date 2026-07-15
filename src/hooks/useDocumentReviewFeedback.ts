import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReviewFeedbackType = "confirmed" | "irrelevant" | "adjust_rule";

export const useDocumentReviewFeedback = (documentId: string) => {
  const [feedback, setFeedback] = useState<Record<string, ReviewFeedbackType>>({});

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("service_document_review_feedback")
      .select("finding_key, feedback_type")
      .eq("service_document_id", documentId);
    setFeedback(Object.fromEntries((data ?? []).map((item) => [item.finding_key, item.feedback_type as ReviewFeedbackType])));
  }, [documentId]);

  useEffect(() => { refresh(); }, [refresh]);

  const submitFeedback = async (findingKey: string, feedbackType: ReviewFeedbackType) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Usuário não autenticado") };
    const { error } = await supabase
      .from("service_document_review_feedback")
      .upsert({
        service_document_id: documentId,
        finding_key: findingKey,
        feedback_type: feedbackType,
        created_by: user.id,
      }, { onConflict: "service_document_id,finding_key" });
    if (!error) await refresh();
    return { error };
  };

  return { feedback, submitFeedback };
};
