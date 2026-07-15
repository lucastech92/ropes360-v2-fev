-- A liberação logística registra a decisão operacional, mas não bloqueia o JBR
-- quando ainda há itens pendentes no checklist.

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

  UPDATE public.services
  SET logistics_checklist_approved_at = CASE
        WHEN EXISTS (
          SELECT 1
          FROM public.service_checklists sc
          JOIN public.checklist_items ci ON ci.checklist_id = sc.checklist_id
          WHERE sc.service_id = p_service_id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.service_checklists sc
          JOIN public.checklist_items ci ON ci.checklist_id = sc.checklist_id
          WHERE sc.service_id = p_service_id
            AND ci.is_checked IS NOT TRUE
        )
        THEN now()
        ELSE NULL
      END,
      logistics_checklist_approved_by = CASE
        WHEN EXISTS (
          SELECT 1
          FROM public.service_checklists sc
          JOIN public.checklist_items ci ON ci.checklist_id = sc.checklist_id
          WHERE sc.service_id = p_service_id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.service_checklists sc
          JOIN public.checklist_items ci ON ci.checklist_id = sc.checklist_id
          WHERE sc.service_id = p_service_id
            AND ci.is_checked IS NOT TRUE
        )
        THEN auth.uid()
        ELSE NULL
      END,
      logistics_released_at = now(),
      logistics_released_by = auth.uid()
  WHERE id = p_service_id
  RETURNING * INTO v_service;

  RETURN v_service;
END;
$$;
