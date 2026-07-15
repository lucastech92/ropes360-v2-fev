-- Sprint 10: governança da Central de Conhecimento Técnico.
-- Mantém os documentos e trechos existentes e adiciona autoridade, versão e vigência.

ALTER TABLE public.technical_documents
  ADD COLUMN IF NOT EXISTS knowledge_type text NOT NULL DEFAULT 'internal_procedure',
  ADD COLUMN IF NOT EXISTS authority_rank integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS revision text,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS equipment_scope text,
  ADD COLUMN IF NOT EXISTS supersedes_document_id uuid REFERENCES public.technical_documents(id),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE public.technical_documents
    ADD CONSTRAINT technical_documents_knowledge_type_check
    CHECK (knowledge_type IN ('standard','internal_procedure','client_requirement','manufacturer_manual','historical_report','other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.technical_documents
    ADD CONSTRAINT technical_documents_approval_status_check
    CHECK (approval_status IN ('draft','approved','obsolete','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.technical_documents
    ADD CONSTRAINT technical_documents_authority_rank_check
    CHECK (authority_rank BETWEEN 1 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.technical_documents
SET knowledge_type = CASE
      WHEN document_type ILIKE '%iso%' OR title ILIKE '%ISO 4309%' THEN 'standard'
      WHEN document_type ILIKE '%manual%' THEN 'manufacturer_manual'
      ELSE knowledge_type
    END,
    authority_rank = CASE
      WHEN document_type ILIKE '%iso%' OR title ILIKE '%ISO 4309%' THEN 10
      WHEN document_type ILIKE '%manual%' THEN 40
      ELSE authority_rank
    END;

CREATE INDEX IF NOT EXISTS idx_technical_documents_knowledge_status
  ON public.technical_documents (approval_status, is_active, authority_rank);
CREATE INDEX IF NOT EXISTS idx_technical_documents_client
  ON public.technical_documents (client_name) WHERE client_name IS NOT NULL;

-- Busca rastreável: retorna apenas fontes prontas, ativas e aprovadas,
-- priorizando maior autoridade (menor rank) e incluindo metadados para citação.
CREATE OR REPLACE FUNCTION public.search_approved_technical_knowledge(
  search_query text,
  match_count integer DEFAULT 12,
  filter_document_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  document_title text,
  file_name text,
  knowledge_type text,
  revision text,
  authority_rank integer,
  effective_date date,
  client_name text,
  metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    de.id,
    td.id,
    de.content,
    de.chunk_index,
    td.title,
    td.file_name,
    td.knowledge_type,
    td.revision,
    td.authority_rank,
    td.effective_date,
    td.client_name,
    coalesce(de.metadata, '{}'::jsonb) || jsonb_build_object(
      'document_title', td.title,
      'file_name', td.file_name,
      'revision', td.revision,
      'knowledge_type', td.knowledge_type,
      'chunk_index', de.chunk_index,
      'authority_rank', td.authority_rank
    )
  FROM public.document_embeddings de
  JOIN public.technical_documents td ON td.id = de.document_id
  WHERE td.status = 'ready'
    AND td.is_active = true
    AND td.approval_status = 'approved'
    AND (td.expiry_date IS NULL OR td.expiry_date >= current_date)
    AND (filter_document_ids IS NULL OR td.id = ANY(filter_document_ids))
    AND (
      de.content ILIKE '%' || search_query || '%'
      OR td.title ILIKE '%' || search_query || '%'
    )
  ORDER BY
    CASE WHEN td.title ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    td.authority_rank ASC,
    de.chunk_index ASC
  LIMIT greatest(1, least(match_count, 30));
$$;

GRANT EXECUTE ON FUNCTION public.search_approved_technical_knowledge(text, integer, uuid[]) TO authenticated;
