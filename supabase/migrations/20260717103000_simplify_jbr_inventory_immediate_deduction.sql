-- Simplifica o estoque do JBR: vincular um checklist de saída baixa o saldo imediatamente.
-- A liberação logística apenas confirma o despacho e nunca baixa o mesmo item novamente.

DROP TRIGGER IF EXISTS validate_checklist_item_reservation_trigger ON public.checklist_items;
DROP TRIGGER IF EXISTS validate_service_checklist_reservation_trigger ON public.service_checklists;
DROP TRIGGER IF EXISTS validate_checklist_type_reservation_trigger ON public.checklists;

CREATE OR REPLACE FUNCTION public.apply_service_checklist_item_stock(
  p_service_id uuid,
  p_checklist_id uuid,
  p_checklist_item_id uuid,
  p_inventory_item_id uuid,
  p_quantity integer,
  p_item_name text,
  p_actor uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service public.services;
  v_checklist_name text;
  v_previous_quantity integer;
  v_new_quantity integer;
BEGIN
  IF p_inventory_item_id IS NULL OR COALESCE(p_quantity, 0) <= 0 THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.service_dispatch_items
    WHERE service_id = p_service_id
      AND source_checklist_item_id = p_checklist_item_id
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'JBR not found';
  END IF;

  IF v_service.logistics_released_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot add inventory items after the JBR logistics release';
  END IF;

  SELECT name INTO v_checklist_name
  FROM public.checklists
  WHERE id = p_checklist_id;

  SELECT quantity INTO v_previous_quantity
  FROM public.inventory
  WHERE id = p_inventory_item_id
  FOR UPDATE;

  IF v_previous_quantity IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  IF v_previous_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for inventory item %: available %, requested %',
      p_inventory_item_id, v_previous_quantity, p_quantity;
  END IF;

  v_new_quantity := v_previous_quantity - p_quantity;

  UPDATE public.inventory
  SET quantity = v_new_quantity,
      status = CASE WHEN item_type = 'equipamento' AND v_new_quantity = 0 THEN 'in_service' ELSE status END,
      current_location = CASE WHEN item_type = 'equipamento' AND v_new_quantity = 0 THEN v_service.codigo_jbr ELSE current_location END,
      last_updated = now()
  WHERE id = p_inventory_item_id;

  INSERT INTO public.service_dispatch_items (
    service_id,
    source_checklist_id,
    source_checklist_item_id,
    inventory_item_id,
    checklist_name,
    item_name,
    dispatched_quantity,
    created_by
  ) VALUES (
    p_service_id,
    p_checklist_id,
    p_checklist_item_id,
    p_inventory_item_id,
    COALESCE(v_checklist_name, 'Checklist'),
    COALESCE(p_item_name, 'Item do inventário'),
    p_quantity,
    COALESCE(p_actor, auth.uid())
  );

  INSERT INTO public.service_inventory_movements (
    service_id, inventory_item_id, movement_type, quantity,
    previous_quantity, new_quantity, notes, created_by
  ) VALUES (
    p_service_id, p_inventory_item_id, 'dispatch', p_quantity,
    v_previous_quantity, v_new_quantity,
    'Baixa automática ao vincular item de checklist ao JBR',
    COALESCE(p_actor, auth.uid())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_service_dispatch_item(
  p_dispatch_item_id uuid,
  p_actor uuid DEFAULT NULL,
  p_notes text DEFAULT 'Estorno por remoção do checklist do JBR'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispatch public.service_dispatch_items;
  v_service public.services;
  v_inventory public.inventory;
  v_new_quantity integer;
BEGIN
  SELECT * INTO v_dispatch
  FROM public.service_dispatch_items
  WHERE id = p_dispatch_item_id
  FOR UPDATE;

  IF v_dispatch.id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_service
  FROM public.services
  WHERE id = v_dispatch.service_id
  FOR UPDATE;

  IF v_service.logistics_released_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot remove inventory items after the JBR logistics release';
  END IF;

  IF v_dispatch.inventory_item_id IS NOT NULL THEN
    SELECT * INTO v_inventory
    FROM public.inventory
    WHERE id = v_dispatch.inventory_item_id
    FOR UPDATE;

    IF v_inventory.id IS NOT NULL THEN
      v_new_quantity := COALESCE(v_inventory.quantity, 0) + v_dispatch.dispatched_quantity;

      UPDATE public.inventory
      SET quantity = v_new_quantity,
          status = CASE WHEN item_type = 'equipamento' THEN 'available' ELSE status END,
          current_location = CASE WHEN item_type = 'equipamento' THEN 'Base' ELSE current_location END,
          last_updated = now()
      WHERE id = v_dispatch.inventory_item_id;

      INSERT INTO public.service_inventory_movements (
        service_id, inventory_item_id, movement_type, quantity,
        previous_quantity, new_quantity, notes, created_by
      ) VALUES (
        v_dispatch.service_id, v_dispatch.inventory_item_id, 'return', v_dispatch.dispatched_quantity,
        COALESCE(v_inventory.quantity, 0), v_new_quantity, p_notes,
        COALESCE(p_actor, auth.uid())
      );
    END IF;
  END IF;

  DELETE FROM public.service_dispatch_items WHERE id = p_dispatch_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_stock_when_service_checklist_linked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
BEGIN
  FOR v_item IN
    SELECT ci.id, ci.inventory_item_id, ci.target_quantity, ci.item_text
    FROM public.checklists c
    JOIN public.checklist_items ci ON ci.checklist_id = c.id
    WHERE c.id = NEW.checklist_id
      AND c.checklist_type = 'saida'
      AND ci.inventory_item_id IS NOT NULL
      AND COALESCE(ci.target_quantity, 0) > 0
    ORDER BY ci.order_index, ci.id
  LOOP
    PERFORM public.apply_service_checklist_item_stock(
      NEW.service_id,
      NEW.checklist_id,
      v_item.id,
      v_item.inventory_item_id,
      v_item.target_quantity,
      v_item.item_text,
      auth.uid()
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_stock_when_service_checklist_linked_trigger ON public.service_checklists;
CREATE TRIGGER apply_stock_when_service_checklist_linked_trigger
AFTER INSERT ON public.service_checklists
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_when_service_checklist_linked();

CREATE OR REPLACE FUNCTION public.refund_stock_when_service_checklist_unlinked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispatch record;
BEGIN
  FOR v_dispatch IN
    SELECT id
    FROM public.service_dispatch_items
    WHERE service_id = OLD.service_id
      AND source_checklist_id = OLD.checklist_id
    ORDER BY created_at, id
  LOOP
    PERFORM public.refund_service_dispatch_item(
      v_dispatch.id,
      auth.uid(),
      'Estorno automático ao remover checklist do JBR'
    );
  END LOOP;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS refund_stock_when_service_checklist_unlinked_trigger ON public.service_checklists;
CREATE TRIGGER refund_stock_when_service_checklist_unlinked_trigger
BEFORE DELETE ON public.service_checklists
FOR EACH ROW EXECUTE FUNCTION public.refund_stock_when_service_checklist_unlinked();

CREATE OR REPLACE FUNCTION public.apply_stock_when_linked_checklist_item_saved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link record;
  v_type text;
BEGIN
  SELECT checklist_type INTO v_type
  FROM public.checklists
  WHERE id = NEW.checklist_id;

  IF v_type <> 'saida' THEN
    RETURN NEW;
  END IF;

  FOR v_link IN
    SELECT service_id
    FROM public.service_checklists
    WHERE checklist_id = NEW.checklist_id
  LOOP
    PERFORM public.apply_service_checklist_item_stock(
      v_link.service_id,
      NEW.checklist_id,
      NEW.id,
      NEW.inventory_item_id,
      NEW.target_quantity,
      NEW.item_text,
      auth.uid()
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_stock_when_linked_checklist_item_saved_trigger ON public.checklist_items;
CREATE TRIGGER apply_stock_when_linked_checklist_item_saved_trigger
AFTER INSERT OR UPDATE OF inventory_item_id, target_quantity ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_when_linked_checklist_item_saved();

CREATE OR REPLACE FUNCTION public.refund_stock_before_linked_checklist_item_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispatch record;
BEGIN
  FOR v_dispatch IN
    SELECT id
    FROM public.service_dispatch_items
    WHERE source_checklist_item_id = OLD.id
    ORDER BY created_at, id
  LOOP
    PERFORM public.refund_service_dispatch_item(
      v_dispatch.id,
      auth.uid(),
      CASE WHEN TG_OP = 'DELETE'
        THEN 'Estorno automático ao remover item do checklist'
        ELSE 'Ajuste automático da quantidade do item no checklist'
      END
    );
  END LOOP;
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS refund_stock_before_linked_checklist_item_delete_trigger ON public.checklist_items;
CREATE TRIGGER refund_stock_before_linked_checklist_item_delete_trigger
BEFORE DELETE ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION public.refund_stock_before_linked_checklist_item_change();

DROP TRIGGER IF EXISTS refund_stock_before_linked_checklist_item_update_trigger ON public.checklist_items;
CREATE TRIGGER refund_stock_before_linked_checklist_item_update_trigger
BEFORE UPDATE OF inventory_item_id, target_quantity ON public.checklist_items
FOR EACH ROW
WHEN (
  OLD.inventory_item_id IS DISTINCT FROM NEW.inventory_item_id
  OR OLD.target_quantity IS DISTINCT FROM NEW.target_quantity
)
EXECUTE FUNCTION public.refund_stock_before_linked_checklist_item_change();

CREATE OR REPLACE FUNCTION public.prevent_linked_checklist_type_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.checklist_type IS DISTINCT FROM NEW.checklist_type
     AND EXISTS (SELECT 1 FROM public.service_checklists WHERE checklist_id = OLD.id) THEN
    RAISE EXCEPTION 'Remove the checklist from the JBR before changing its type';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_linked_checklist_type_change_trigger ON public.checklists;
CREATE TRIGGER prevent_linked_checklist_type_change_trigger
BEFORE UPDATE OF checklist_type ON public.checklists
FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_checklist_type_change();

-- Converte vínculos ativos do modelo antigo de reserva para baixa física imediata.
DO $$
DECLARE
  v_link record;
  v_item record;
BEGIN
  FOR v_link IN
    SELECT sc.service_id, sc.checklist_id, s.created_by
    FROM public.service_checklists sc
    JOIN public.services s ON s.id = sc.service_id
    WHERE s.logistics_released_at IS NULL
    ORDER BY sc.created_at, sc.id
  LOOP
    FOR v_item IN
      SELECT ci.id, ci.inventory_item_id, ci.target_quantity, ci.item_text
      FROM public.checklists c
      JOIN public.checklist_items ci ON ci.checklist_id = c.id
      WHERE c.id = v_link.checklist_id
        AND c.checklist_type = 'saida'
        AND ci.inventory_item_id IS NOT NULL
        AND COALESCE(ci.target_quantity, 0) > 0
      ORDER BY ci.order_index, ci.id
    LOOP
      PERFORM public.apply_service_checklist_item_stock(
        v_link.service_id,
        v_link.checklist_id,
        v_item.id,
        v_item.inventory_item_id,
        v_item.target_quantity,
        v_item.item_text,
        v_link.created_by
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Mantém as consultas antigas compatíveis, agora sem o conceito de reserva.
CREATE OR REPLACE VIEW public.service_inventory_reservations
WITH (security_invoker = true)
AS
SELECT
  sdi.service_id,
  s.codigo_jbr,
  sdi.inventory_item_id,
  i.item_name,
  i.unit,
  0::integer AS reserved_quantity,
  SUM(sdi.dispatched_quantity)::integer AS prepared_quantity
FROM public.service_dispatch_items sdi
JOIN public.services s ON s.id = sdi.service_id
JOIN public.inventory i ON i.id = sdi.inventory_item_id
WHERE s.logistics_released_at IS NULL
GROUP BY sdi.service_id, s.codigo_jbr, sdi.inventory_item_id, i.item_name, i.unit;

CREATE OR REPLACE VIEW public.inventory_stock_availability
WITH (security_invoker = true)
AS
SELECT
  i.id AS inventory_item_id,
  COALESCE(i.quantity, 0)::integer AS physical_quantity,
  0::integer AS reserved_quantity,
  COALESCE(i.quantity, 0)::integer AS available_quantity
FROM public.inventory i;

CREATE OR REPLACE FUNCTION public.get_inventory_stock_availability(p_service_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  item_name text,
  quantity integer,
  unit text,
  status public.equipment_status,
  next_calibration date,
  physical_quantity integer,
  reserved_quantity integer,
  reserved_for_service integer,
  available_quantity integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.item_name,
    COALESCE(i.quantity, 0)::integer,
    i.unit,
    i.status,
    i.next_calibration,
    COALESCE(i.quantity, 0)::integer,
    0::integer,
    0::integer,
    COALESCE(i.quantity, 0)::integer
  FROM public.inventory i
  ORDER BY i.item_name;
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
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'inspector')
  ) THEN
    RAISE EXCEPTION 'Only operational users can release JBR logistics';
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
      logistics_released_at = COALESCE(logistics_released_at, now()),
      logistics_released_by = COALESCE(logistics_released_by, auth.uid())
  WHERE id = p_service_id
  RETURNING * INTO v_service;

  RETURN v_service;
END;
$$;

GRANT SELECT ON public.service_inventory_reservations TO authenticated;
GRANT SELECT ON public.inventory_stock_availability TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_stock_availability(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_service_logistics(uuid) TO authenticated;

COMMENT ON VIEW public.inventory_stock_availability IS
  'Saldo físico e disponível após a baixa imediata dos checklists vinculados a JBRs.';
