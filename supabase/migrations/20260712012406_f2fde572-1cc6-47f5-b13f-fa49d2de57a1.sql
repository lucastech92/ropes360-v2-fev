DROP TRIGGER IF EXISTS trigger_update_inventory_from_checklist ON public.checklist_items;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS logistics_inventory_dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS logistics_inventory_dispatched_by uuid REFERENCES auth.users(id);

ALTER TABLE public.service_return_sessions
  ADD COLUMN IF NOT EXISTS inventory_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_applied_by uuid REFERENCES auth.users(id);

CREATE TABLE IF NOT EXISTS public.service_dispatch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  source_checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE RESTRICT,
  source_checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE RESTRICT,
  inventory_item_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  checklist_name text NOT NULL,
  item_name text NOT NULL,
  dispatched_quantity integer NOT NULL CHECK (dispatched_quantity > 0),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, source_checklist_item_id)
);

CREATE TABLE IF NOT EXISTS public.service_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  return_session_id uuid REFERENCES public.service_return_sessions(id) ON DELETE SET NULL,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN (
    'dispatch', 'return', 'consumption', 'missing', 'damaged', 'maintenance'
  )),
  quantity integer NOT NULL CHECK (quantity >= 0),
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_dispatch_items_service
  ON public.service_dispatch_items(service_id);
CREATE INDEX IF NOT EXISTS idx_service_inventory_movements_service
  ON public.service_inventory_movements(service_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_inventory_movements_inventory
  ON public.service_inventory_movements(inventory_item_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_dispatch_items TO authenticated;
GRANT ALL ON public.service_dispatch_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_inventory_movements TO authenticated;
GRANT ALL ON public.service_inventory_movements TO service_role;

ALTER TABLE public.service_dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view service dispatch items" ON public.service_dispatch_items;
CREATE POLICY "Authenticated users can view service dispatch items"
  ON public.service_dispatch_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view service inventory movements" ON public.service_inventory_movements;
CREATE POLICY "Authenticated users can view service inventory movements"
  ON public.service_inventory_movements FOR SELECT TO authenticated USING (true);

INSERT INTO public.service_dispatch_items (
  service_id, source_checklist_id, source_checklist_item_id,
  inventory_item_id, checklist_name, item_name, dispatched_quantity, created_by
)
SELECT
  sc.service_id, c.id, ci.id, ci.inventory_item_id,
  c.name, ci.item_text, COALESCE(ci.current_quantity, 0), s.created_by
FROM public.service_checklists sc
JOIN public.services s ON s.id = sc.service_id
JOIN public.checklists c ON c.id = sc.checklist_id
JOIN public.checklist_items ci ON ci.checklist_id = c.id
WHERE c.checklist_type = 'saida'
  AND COALESCE(ci.current_quantity, 0) > 0
ON CONFLICT (service_id, source_checklist_item_id) DO NOTHING;

UPDATE public.services s
SET logistics_inventory_dispatched_at = COALESCE(s.logistics_released_at, now()),
    logistics_inventory_dispatched_by = COALESCE(s.logistics_released_by, s.created_by)
WHERE s.logistics_inventory_dispatched_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.service_dispatch_items sdi WHERE sdi.service_id = s.id
  );

CREATE OR REPLACE FUNCTION public.release_service_logistics(p_service_id uuid)
RETURNS public.services
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service public.services;
  v_resource record;
  v_previous_quantity integer;
  v_new_quantity integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Only coordinators can release JBR logistics';
  END IF;

  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'JBR not found';
  END IF;

  IF v_service.logistics_container_id IS NULL THEN
    RAISE EXCEPTION 'Select a container before releasing the JBR';
  END IF;

  IF v_service.logistics_inventory_dispatched_at IS NULL THEN
    FOR v_resource IN
      SELECT
        ci.inventory_item_id,
        SUM(COALESCE(ci.current_quantity, 0))::integer AS dispatched_quantity
      FROM public.service_checklists sc
      JOIN public.checklists c ON c.id = sc.checklist_id
      JOIN public.checklist_items ci ON ci.checklist_id = c.id
      WHERE sc.service_id = p_service_id
        AND c.checklist_type = 'saida'
        AND ci.inventory_item_id IS NOT NULL
        AND COALESCE(ci.current_quantity, 0) > 0
      GROUP BY ci.inventory_item_id
    LOOP
      SELECT quantity INTO v_previous_quantity
      FROM public.inventory
      WHERE id = v_resource.inventory_item_id
      FOR UPDATE;

      IF v_previous_quantity IS NULL THEN
        RAISE EXCEPTION 'Inventory item not found';
      END IF;

      IF v_previous_quantity < v_resource.dispatched_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for inventory item %: available %, requested %',
          v_resource.inventory_item_id, v_previous_quantity, v_resource.dispatched_quantity;
      END IF;
    END LOOP;

    INSERT INTO public.service_dispatch_items (
      service_id,
      source_checklist_id,
      source_checklist_item_id,
      inventory_item_id,
      checklist_name,
      item_name,
      dispatched_quantity,
      created_by
    )
    SELECT
      p_service_id,
      c.id,
      ci.id,
      ci.inventory_item_id,
      c.name,
      ci.item_text,
      COALESCE(ci.current_quantity, 0),
      auth.uid()
    FROM public.service_checklists sc
    JOIN public.checklists c ON c.id = sc.checklist_id
    JOIN public.checklist_items ci ON ci.checklist_id = c.id
    WHERE sc.service_id = p_service_id
      AND c.checklist_type = 'saida'
      AND COALESCE(ci.current_quantity, 0) > 0
    ON CONFLICT (service_id, source_checklist_item_id) DO NOTHING;

    FOR v_resource IN
      SELECT inventory_item_id, SUM(dispatched_quantity)::integer AS dispatched_quantity
      FROM public.service_dispatch_items
      WHERE service_id = p_service_id
        AND inventory_item_id IS NOT NULL
      GROUP BY inventory_item_id
    LOOP
      SELECT quantity INTO v_previous_quantity
      FROM public.inventory
      WHERE id = v_resource.inventory_item_id
      FOR UPDATE;

      v_new_quantity := v_previous_quantity - v_resource.dispatched_quantity;

      UPDATE public.inventory
      SET quantity = v_new_quantity,
          status = CASE WHEN item_type = 'equipamento' AND v_new_quantity = 0 THEN 'in_service' ELSE status END,
          current_location = CASE WHEN item_type = 'equipamento' AND v_new_quantity = 0 THEN v_service.codigo_jbr ELSE current_location END,
          last_updated = now()
      WHERE id = v_resource.inventory_item_id;

      INSERT INTO public.service_inventory_movements (
        service_id, inventory_item_id, movement_type, quantity,
        previous_quantity, new_quantity, notes, created_by
      ) VALUES (
        p_service_id, v_resource.inventory_item_id, 'dispatch', v_resource.dispatched_quantity,
        v_previous_quantity, v_new_quantity, 'Baixa confirmada na liberação logística', auth.uid()
      );
    END LOOP;
  END IF;

  UPDATE public.services
  SET logistics_checklist_approved_at = CASE
        WHEN EXISTS (
          SELECT 1 FROM public.service_checklists sc
          JOIN public.checklist_items ci ON ci.checklist_id = sc.checklist_id
          WHERE sc.service_id = p_service_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.service_checklists sc
          JOIN public.checklist_items ci ON ci.checklist_id = sc.checklist_id
          WHERE sc.service_id = p_service_id AND ci.is_checked IS NOT TRUE
        ) THEN now() ELSE NULL END,
      logistics_checklist_approved_by = CASE
        WHEN EXISTS (
          SELECT 1 FROM public.service_checklists sc
          JOIN public.checklist_items ci ON ci.checklist_id = sc.checklist_id
          WHERE sc.service_id = p_service_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.service_checklists sc
          JOIN public.checklist_items ci ON ci.checklist_id = sc.checklist_id
          WHERE sc.service_id = p_service_id AND ci.is_checked IS NOT TRUE
        ) THEN auth.uid() ELSE NULL END,
      logistics_inventory_dispatched_at = COALESCE(logistics_inventory_dispatched_at, now()),
      logistics_inventory_dispatched_by = COALESCE(logistics_inventory_dispatched_by, auth.uid()),
      logistics_released_at = now(),
      logistics_released_by = auth.uid()
  WHERE id = p_service_id
  RETURNING * INTO v_service;

  RETURN v_service;
END;
$$;

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
  ON CONFLICT (service_id) DO UPDATE SET updated_at = now()
  RETURNING * INTO v_session;

  INSERT INTO public.service_return_items (
    return_session_id, source_checklist_id, source_checklist_item_id,
    inventory_item_id, checklist_name, item_name, dispatched_quantity
  )
  SELECT
    v_session.id, sdi.source_checklist_id, sdi.source_checklist_item_id,
    sdi.inventory_item_id, sdi.checklist_name, sdi.item_name, sdi.dispatched_quantity
  FROM public.service_dispatch_items sdi
  WHERE sdi.service_id = p_service_id
  ON CONFLICT (return_session_id, source_checklist_item_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.service_return_items WHERE return_session_id = v_session.id
  ) THEN
    INSERT INTO public.service_return_items (
      return_session_id, source_checklist_id, source_checklist_item_id,
      inventory_item_id, checklist_name, item_name, dispatched_quantity
    )
    SELECT
      v_session.id, c.id, ci.id, ci.inventory_item_id,
      c.name, ci.item_text, COALESCE(ci.current_quantity, 0)
    FROM public.service_checklists sc
    JOIN public.checklists c ON c.id = sc.checklist_id
    JOIN public.checklist_items ci ON ci.checklist_id = c.id
    WHERE sc.service_id = p_service_id
      AND c.checklist_type = 'saida'
      AND COALESCE(ci.current_quantity, 0) > 0
    ON CONFLICT (return_session_id, source_checklist_item_id) DO NOTHING;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.service_return_items WHERE return_session_id = v_session.id
  ) THEN
    RAISE EXCEPTION 'No dispatched checklist items were found for this JBR';
  END IF;

  RETURN v_session;
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
  v_item record;
  v_inventory public.inventory;
  v_previous_quantity integer;
  v_new_quantity integer;
  v_return_to_stock integer;
  v_missing_quantity integer;
  v_movement_type text;
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
    WHERE return_session_id = p_return_session_id AND checked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Check every returned item before completing the return';
  END IF;

  IF v_session.inventory_applied_at IS NULL THEN
    FOR v_item IN
      SELECT
        inventory_item_id,
        dispatched_quantity,
        COALESCE(returned_quantity, 0)::integer AS returned_quantity,
        COALESCE(consumed_quantity, 0)::integer AS consumed_quantity,
        return_condition
      FROM public.service_return_items
      WHERE return_session_id = p_return_session_id
        AND inventory_item_id IS NOT NULL
      ORDER BY created_at, id
    LOOP
      SELECT * INTO v_inventory
      FROM public.inventory
      WHERE id = v_item.inventory_item_id
      FOR UPDATE;

      IF v_inventory.id IS NULL THEN
        RAISE EXCEPTION 'Inventory item not found';
      END IF;

      v_previous_quantity := COALESCE(v_inventory.quantity, 0);
      v_missing_quantity := GREATEST(v_item.dispatched_quantity - v_item.returned_quantity, 0);

      IF v_inventory.item_type = 'consumivel' THEN
        v_return_to_stock := v_item.returned_quantity;
        v_new_quantity := v_previous_quantity + v_return_to_stock;

        UPDATE public.inventory
        SET quantity = v_new_quantity, last_updated = now()
        WHERE id = v_item.inventory_item_id;

        IF v_return_to_stock > 0 THEN
          INSERT INTO public.service_inventory_movements (
            service_id, return_session_id, inventory_item_id, movement_type,
            quantity, previous_quantity, new_quantity, notes, created_by
          ) VALUES (
            v_session.service_id, v_session.id, v_item.inventory_item_id, 'return',
            v_return_to_stock, v_previous_quantity, v_new_quantity,
            'Saldo devolvido ao almoxarifado', auth.uid()
          );
        END IF;

        IF v_item.consumed_quantity > 0 THEN
          INSERT INTO public.service_inventory_movements (
            service_id, return_session_id, inventory_item_id, movement_type,
            quantity, previous_quantity, new_quantity, notes, created_by
          ) VALUES (
            v_session.service_id, v_session.id, v_item.inventory_item_id, 'consumption',
            v_item.consumed_quantity, v_new_quantity, v_new_quantity,
            'Consumo consolidado no retorno', auth.uid()
          );
        END IF;
      ELSE
        IF v_item.return_condition IN ('damaged', 'maintenance') THEN
          v_return_to_stock := 0;
          v_new_quantity := v_previous_quantity;
          v_movement_type := CASE WHEN v_item.return_condition = 'maintenance' THEN 'maintenance' ELSE 'damaged' END;

          UPDATE public.inventory
          SET status = CASE WHEN v_item.return_condition = 'maintenance' THEN 'maintenance' ELSE 'inactive' END,
              current_location = 'Base - aguardando manutenção',
              last_updated = now()
          WHERE id = v_item.inventory_item_id;

          IF v_item.returned_quantity > 0 THEN
            INSERT INTO public.service_inventory_movements (
              service_id, return_session_id, inventory_item_id, movement_type,
              quantity, previous_quantity, new_quantity, notes, created_by
            ) VALUES (
              v_session.service_id, v_session.id, v_item.inventory_item_id, v_movement_type,
              v_item.returned_quantity, v_previous_quantity, v_new_quantity,
              'Equipamento retornou indisponível para uso', auth.uid()
            );
          END IF;
        ELSE
          v_return_to_stock := v_item.returned_quantity;
          v_new_quantity := v_previous_quantity + v_return_to_stock;

          UPDATE public.inventory
          SET quantity = v_new_quantity,
              status = CASE WHEN v_return_to_stock > 0 THEN 'available' ELSE status END,
              current_location = CASE WHEN v_return_to_stock > 0 THEN 'Base' ELSE current_location END,
              last_updated = now()
          WHERE id = v_item.inventory_item_id;

          IF v_return_to_stock > 0 THEN
            INSERT INTO public.service_inventory_movements (
              service_id, return_session_id, inventory_item_id, movement_type,
              quantity, previous_quantity, new_quantity, notes, created_by
            ) VALUES (
              v_session.service_id, v_session.id, v_item.inventory_item_id, 'return',
              v_return_to_stock, v_previous_quantity, v_new_quantity,
              'Equipamento devolvido disponível', auth.uid()
            );
          END IF;
        END IF;

        IF v_missing_quantity > 0 THEN
          INSERT INTO public.service_inventory_movements (
            service_id, return_session_id, inventory_item_id, movement_type,
            quantity, previous_quantity, new_quantity, notes, created_by
          ) VALUES (
            v_session.service_id, v_session.id, v_item.inventory_item_id, 'missing',
            v_missing_quantity, v_new_quantity, v_new_quantity,
            'Equipamento não retornado', auth.uid()
          );
        END IF;
      END IF;
    END LOOP;

    UPDATE public.service_return_sessions
    SET inventory_applied_at = now(), inventory_applied_by = auth.uid()
    WHERE id = p_return_session_id;
  END IF;

  UPDATE public.service_return_sessions
  SET status = 'completed',
      notes = NULLIF(trim(COALESCE(p_notes, '')), ''),
      completed_by = COALESCE(completed_by, auth.uid()),
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
  WHERE id = p_return_session_id
  RETURNING * INTO v_session;

  SELECT logistics_container_id INTO v_container_id
  FROM public.services WHERE id = v_session.service_id;

  IF v_container_id IS NOT NULL THEN
    UPDATE public.operation_containers
    SET status = 'available', assigned_service_id = NULL
    WHERE id = v_container_id AND assigned_service_id = v_session.service_id;
  END IF;

  RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_service_logistics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_service_return(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_service_return(uuid, text) TO authenticated;