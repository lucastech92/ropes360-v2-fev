CREATE TABLE IF NOT EXISTS public.service_document_review_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_document_id uuid NOT NULL REFERENCES public.service_documents(id) ON DELETE CASCADE,
  finding_key text NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('confirmed', 'irrelevant', 'adjust_rule')),
  note text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_document_id, finding_key)
);

ALTER TABLE public.service_document_review_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view document review feedback"
  ON public.service_document_review_feedback FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create document review feedback"
  ON public.service_document_review_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own document review feedback"
  ON public.service_document_review_feedback FOR UPDATE TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.set_service_document_review_feedback_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_service_document_review_feedback_updated_at_trigger
  BEFORE UPDATE ON public.service_document_review_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_service_document_review_feedback_updated_at();
