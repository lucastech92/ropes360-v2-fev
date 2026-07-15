-- Sprint 1: formaliza o ciclo operacional do JBR sem substituir a tabela services.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'planning',
  ADD COLUMN IF NOT EXISTS operational_status_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid REFERENCES auth.users(id);

UPDATE public.services
SET responsible_user_id = created_by
WHERE responsible_user_id IS NULL AND created_by IS NOT NULL;

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_operational_status_check;

ALTER TABLE public.services
  ADD CONSTRAINT services_operational_status_check
  CHECK (operational_status IN (
    'planning',
    'preparation',
    'logistics',
    'field',
    'documentation',
    'technical_review',
    'return',
    'completed'
  ));

CREATE INDEX IF NOT EXISTS idx_services_operational_status
  ON public.services (operational_status);

CREATE TABLE IF NOT EXISTS public.service_phase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_phase_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view service phase history" ON public.service_phase_history;
CREATE POLICY "Authenticated users can view service phase history"
  ON public.service_phase_history FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.enforce_service_operational_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.operational_status IS DISTINCT FROM OLD.operational_status THEN
    IF NOT (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
    ) THEN
      RAISE EXCEPTION 'Only coordinators can change the operational status of a JBR';
    END IF;

    NEW.operational_status_updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_service_operational_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.operational_status IS DISTINCT FROM OLD.operational_status THEN
    INSERT INTO public.service_phase_history (
      service_id,
      previous_status,
      new_status,
      changed_by
    )
    VALUES (
      NEW.id,
      OLD.operational_status,
      NEW.operational_status,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_service_operational_status_trigger ON public.services;
CREATE TRIGGER enforce_service_operational_status_trigger
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.enforce_service_operational_status();

DROP TRIGGER IF EXISTS record_service_operational_status_trigger ON public.services;
CREATE TRIGGER record_service_operational_status_trigger
  AFTER UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.record_service_operational_status();

DROP FUNCTION IF EXISTS public.get_services_with_counts();

CREATE FUNCTION public.get_services_with_counts()
RETURNS TABLE (
  id uuid,
  codigo_jbr text,
  cliente text,
  local text,
  escopo text[],
  outros_escopo text,
  aplicacao text,
  equipamentos text,
  data_inicio date,
  data_termino date,
  created_at timestamptz,
  operational_status text,
  responsible_user_id uuid,
  collaborators_count bigint,
  checklists_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.codigo_jbr,
    s.cliente,
    s.local,
    s.escopo,
    s.outros_escopo,
    s.aplicacao,
    s.equipamentos,
    s.data_inicio,
    s.data_termino,
    s.created_at,
    s.operational_status,
    s.responsible_user_id,
    COALESCE((SELECT COUNT(*) FROM service_collaborators sc WHERE sc.service_id = s.id), 0),
    COALESCE((SELECT COUNT(*) FROM service_checklists sch WHERE sch.service_id = s.id), 0)
  FROM services s
  ORDER BY s.created_at DESC;
$$;
