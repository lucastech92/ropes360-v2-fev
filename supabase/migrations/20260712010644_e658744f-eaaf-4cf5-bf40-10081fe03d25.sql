CREATE TABLE IF NOT EXISTS public.service_return_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL UNIQUE REFERENCES public.services(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  notes text,
  started_by uuid REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_session_id uuid NOT NULL REFERENCES public.service_return_sessions(id) ON DELETE CASCADE,
  source_checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE RESTRICT,
  source_checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE RESTRICT,
  inventory_item_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  checklist_name text NOT NULL,
  item_name text NOT NULL,
  dispatched_quantity integer NOT NULL CHECK (dispatched_quantity >= 0),
  returned_quantity integer CHECK (returned_quantity >= 0),
  consumed_quantity integer NOT NULL DEFAULT 0 CHECK (consumed_quantity >= 0),
  return_condition text CHECK (return_condition IN ('good', 'damaged', 'maintenance', 'missing')),
  notes text,
  checked_by uuid REFERENCES auth.users(id),
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (return_session_id, source_checklist_item_id)
);

CREATE INDEX IF NOT EXISTS idx_service_return_items_session
  ON public.service_return_items(return_session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_return_sessions TO authenticated;
GRANT ALL ON public.service_return_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_return_items TO authenticated;
GRANT ALL ON public.service_return_items TO service_role;

ALTER TABLE public.service_return_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage service return sessions" ON public.service_return_sessions;
CREATE POLICY "Authenticated users can manage service return sessions"
  ON public.service_return_sessions FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage service return items" ON public.service_return_items;
CREATE POLICY "Authenticated users can manage service return items"
  ON public.service_return_items FOR ALL TO authenticated
  USING (true) WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.start_service_return(p_service_id uuid)
RETURNS public.service_return_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.service_return_sessions;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = p_service_id) THEN
    RAISE EXCEPTION 'JBR not found';
  END IF;

  INSERT INTO public.service_return_sessions(service_id, started_by)
  VALUES (p_service_id, auth.uid())
  ON CONFLICT (service_id) DO UPDATE
    SET updated_at = now()
  RETURNING * INTO v_session;

  INSERT INTO public.service_return_items (
    return_session_id,
    source_checklist_id,
    source_checklist_item_id,
    inventory_item_id,
    checklist_name,
    item_name,
    dispatched_quantity
  )
  SELECT
    v_session.id,
    c.id,
    ci.id,
    ci.inventory_item_id,
    c.name,
    ci.item_text,
    COALESCE(ci.current_quantity, 0)
  FROM public.service_checklists sc
  JOIN public.checklists c ON c.id = sc.checklist_id
  JOIN public.checklist_items ci ON ci.checklist_id = c.id
  WHERE sc.service_id = p_service_id
    AND c.checklist_type = 'saida'
    AND COALESCE(ci.current_quantity, 0) > 0
  ON CONFLICT (return_session_id, source_checklist_item_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.service_return_items WHERE return_session_id = v_session.id
  ) THEN
    RAISE EXCEPTION 'No dispatched checklist items were found for this JBR';
  END IF;

  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_service_return_item(
  p_return_item_id uuid,
  p_returned_quantity integer,
  p_return_condition text,
  p_notes text DEFAULT NULL
)
RETURNS public.service_return_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.service_return_items;
  v_session_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_item
  FROM public.service_return_items
  WHERE id = p_return_item_id;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Return item not found';
  END IF;

  SELECT status INTO v_session_status
  FROM public.service_return_sessions
  WHERE id = v_item.return_session_id;

  IF v_session_status = 'completed' THEN
    RAISE EXCEPTION 'This return check is already completed';
  END IF;

  IF p_returned_quantity < 0 OR p_returned_quantity > v_item.dispatched_quantity THEN
    RAISE EXCEPTION 'Returned quantity must be between zero and dispatched quantity';
  END IF;

  IF p_return_condition NOT IN ('good', 'damaged', 'maintenance', 'missing') THEN
    RAISE EXCEPTION 'Invalid return condition';
  END IF;

  UPDATE public.service_return_items
  SET returned_quantity = p_returned_quantity,
      consumed_quantity = v_item.dispatched_quantity - p_returned_quantity,
      return_condition = CASE
        WHEN p_returned_quantity = 0 THEN 'missing'
        ELSE p_return_condition
      END,
      notes = NULLIF(trim(COALESCE(p_notes, '')), ''),
      checked_by = auth.uid(),
      checked_at = now(),
      updated_at = now()
  WHERE id = p_return_item_id
  RETURNING * INTO v_item;

  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_service_return(
  p_return_session_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.service_return_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.service_return_sessions;
  v_container_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_session
  FROM public.service_return_sessions
  WHERE id = p_return_session_id
  FOR UPDATE;

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'Return session not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.service_return_items
    WHERE return_session_id = p_return_session_id
      AND checked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Check every returned item before completing the return';
  END IF;

  UPDATE public.service_return_sessions
  SET status = 'completed',
      notes = NULLIF(trim(COALESCE(p_notes, '')), ''),
      completed_by = auth.uid(),
      completed_at = now(),
      updated_at = now()
  WHERE id = p_return_session_id
  RETURNING * INTO v_session;

  SELECT logistics_container_id INTO v_container_id
  FROM public.services
  WHERE id = v_session.service_id;

  IF v_container_id IS NOT NULL THEN
    UPDATE public.operation_containers
    SET status = 'available', assigned_service_id = NULL
    WHERE id = v_container_id AND assigned_service_id = v_session.service_id;
  END IF;

  RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_service_return(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_service_return_item(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_service_return(uuid, text) TO authenticated;