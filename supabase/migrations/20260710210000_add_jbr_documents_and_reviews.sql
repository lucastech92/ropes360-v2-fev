-- Sprint 3: documentos técnicos e parecer de revisão vinculados ao JBR.
CREATE TABLE IF NOT EXISTS public.service_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('report', 'certificate', 'photo', 'other')),
  title text NOT NULL,
  original_file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  review_status text NOT NULL DEFAULT 'uploaded'
    CHECK (review_status IN ('uploaded', 'reviewing', 'reviewed', 'review_failed')),
  review_score numeric(5,2),
  review_result jsonb,
  review_error text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_documents_service_id
  ON public.service_documents(service_id, uploaded_at DESC);

ALTER TABLE public.service_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service documents"
  ON public.service_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can upload service documents"
  ON public.service_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Authenticated users can update service document review"
  ON public.service_documents FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_service_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_service_documents_updated_at_trigger ON public.service_documents;
CREATE TRIGGER set_service_documents_updated_at_trigger
  BEFORE UPDATE ON public.service_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_service_documents_updated_at();
