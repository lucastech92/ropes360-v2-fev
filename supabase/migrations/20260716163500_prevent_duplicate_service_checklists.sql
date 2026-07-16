-- Record the template that originated each JBR checklist and prevent reuse.

ALTER TABLE public.service_checklists
  ADD COLUMN IF NOT EXISTS source_template_id uuid
  REFERENCES public.checklists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_checklists_source_template
  ON public.service_checklists(source_template_id)
  WHERE source_template_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS service_checklists_service_template_unique
  ON public.service_checklists(service_id, source_template_id)
  WHERE source_template_id IS NOT NULL;

COMMENT ON COLUMN public.service_checklists.source_template_id IS
  'Template que originou o checklist clonado para o JBR; usado para impedir cópias repetidas.';
