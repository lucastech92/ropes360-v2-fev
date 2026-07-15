-- Sprint 4: liberação logística mínima do JBR.
-- Mantém o foco em container + checklist aprovado, sem NF, transporte ou horários de saída.

CREATE TABLE IF NOT EXISTS public.operation_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'in_field', 'maintenance', 'inactive')),
  assigned_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operation_containers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view operation containers" ON public.operation_containers;
CREATE POLICY "Authenticated users can view operation containers"
  ON public.operation_containers FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Coordinators can manage operation containers" ON public.operation_containers;
CREATE POLICY "Coordinators can manage operation containers"
  ON public.operation_containers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS logistics_container_id uuid REFERENCES public.operation_containers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS logistics_checklist_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS logistics_checklist_approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS logistics_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS logistics_released_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_operation_containers_status ON public.operation_containers(status);
CREATE INDEX IF NOT EXISTS idx_operation_containers_assigned_service ON public.operation_containers(assigned_service_id);
CREATE INDEX IF NOT EXISTS idx_services_logistics_container ON public.services(logistics_container_id);

CREATE OR REPLACE FUNCTION public.set_operation_container_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_operation_container_updated_at_trigger ON public.operation_containers;
CREATE TRIGGER set_operation_container_updated_at_trigger
  BEFORE UPDATE ON public.operation_containers
  FOR EACH ROW EXECUTE FUNCTION public.set_operation_container_updated_at();

CREATE OR REPLACE FUNCTION public.assign_service_container(
  p_service_id uuid,
  p_container_id uuid
)
RETURNS public.services
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_container_id uuid;
  v_container public.operation_containers;
  v_service public.services;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Only coordinators can assign containers';
  END IF;

  SELECT * INTO v_service FROM public.services WHERE id = p_service_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'JBR not found';
  END IF;

  SELECT * INTO v_container FROM public.operation_containers WHERE id = p_container_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Container not found';
  END IF;

  IF v_container.assigned_service_id IS NOT NULL AND v_container.assigned_service_id <> p_service_id THEN
    RAISE EXCEPTION 'This container is already reserved for another JBR';
  END IF;

  v_previous_container_id := v_service.logistics_container_id;

  IF v_previous_container_id IS NOT NULL AND v_previous_container_id <> p_container_id THEN
    UPDATE public.operation_containers
    SET status = 'available', assigned_service_id = NULL
    WHERE id = v_previous_container_id AND assigned_service_id = p_service_id;
  END IF;

  UPDATE public.operation_containers
  SET status = 'reserved', assigned_service_id = p_service_id
  WHERE id = p_container_id;

  UPDATE public.services
  SET logistics_container_id = p_container_id,
      logistics_checklist_approved_at = NULL,
      logistics_checklist_approved_by = NULL,
      logistics_released_at = NULL,
      logistics_released_by = NULL
  WHERE id = p_service_id
  RETURNING * INTO v_service;

  RETURN v_service;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_service_logistics(p_service_id uuid)
RETURNS public.services
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service public.services;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Only coordinators can release JBR logistics';
  END IF;

  SELECT * INTO v_service FROM public.services WHERE id = p_service_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'JBR not found';
  END IF;

  IF v_service.logistics_container_id IS NULL THEN
    RAISE EXCEPTION 'Select a container before releasing the JBR';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.service_checklists sc
    JOIN public.checklist_items ci ON ci.checklist_id = sc.checklist_id
    WHERE sc.service_id = p_service_id
  ) THEN
    RAISE EXCEPTION 'Add a checklist with items before releasing the JBR';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.service_checklists sc
    JOIN public.checklist_items ci ON ci.checklist_id = sc.checklist_id
    WHERE sc.service_id = p_service_id
      AND ci.is_checked IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'Complete all linked checklist items before releasing the JBR';
  END IF;

  UPDATE public.services
  SET logistics_checklist_approved_at = now(),
      logistics_checklist_approved_by = auth.uid(),
      logistics_released_at = now(),
      logistics_released_by = auth.uid()
  WHERE id = p_service_id
  RETURNING * INTO v_service;

  RETURN v_service;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_service_container(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_service_logistics(uuid) TO authenticated;
