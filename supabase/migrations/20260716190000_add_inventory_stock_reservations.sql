-- Reserva automática de estoque por JBR.
-- A quantidade física permanece inalterada até release_service_logistics.

CREATE OR REPLACE VIEW public.service_inventory_reservations
WITH (security_invoker = true)
AS
SELECT
  sc.service_id,
  s.codigo_jbr,
  ci.inventory_item_id,
  i.item_name,
  i.unit,
  SUM(GREATEST(COALESCE(ci.target_quantity, 0), 0))::integer AS reserved_quantity,
  SUM(GREATEST(COALESCE(ci.current_quantity, 0), 0))::integer AS prepared_quantity
FROM public.service_checklists sc
JOIN public.services s ON s.id = sc.service_id
JOIN public.checklists c ON c.id = sc.checklist_id
JOIN public.checklist_items ci ON ci.checklist_id = c.id
JOIN public.inventory i ON i.id = ci.inventory_item_id
WHERE c.checklist_type = 'saida'
  AND ci.inventory_item_id IS NOT NULL
  AND COALESCE(ci.target_quantity, 0) > 0
  AND s.logistics_inventory_dispatched_at IS NULL
  AND COALESCE(s.operational_status, 'planning') <> 'completed'
GROUP BY sc.service_id, s.codigo_jbr, ci.inventory_item_id, i.item_name, i.unit;

CREATE OR REPLACE VIEW public.inventory_stock_availability
WITH (security_invoker = true)
AS
SELECT
  i.id AS inventory_item_id,
  COALESCE(i.quantity, 0)::integer AS physical_quantity,
  COALESCE(SUM(r.reserved_quantity), 0)::integer AS reserved_quantity,
  GREATEST(COALESCE(i.quantity, 0) - COALESCE(SUM(r.reserved_quantity), 0), 0)::integer AS available_quantity
FROM public.inventory i
LEFT JOIN public.service_inventory_reservations r ON r.inventory_item_id = i.id
GROUP BY i.id, i.quantity;

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
    COALESCE(SUM(r.reserved_quantity), 0)::integer,
    COALESCE(SUM(r.reserved_quantity) FILTER (WHERE r.service_id = p_service_id), 0)::integer,
    GREATEST(
      COALESCE(i.quantity, 0)
      - COALESCE(SUM(r.reserved_quantity), 0),
      0
    )::integer
  FROM public.inventory i
  LEFT JOIN public.service_inventory_reservations r ON r.inventory_item_id = i.id
  GROUP BY i.id, i.item_name, i.quantity, i.unit, i.status, i.next_calibration
  ORDER BY i.item_name;
$$;

CREATE OR REPLACE FUNCTION public.assert_inventory_reservation_capacity(
  p_inventory_item_id uuid,
  p_extra_quantity integer,
  p_excluded_checklist_item_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_physical integer;
  v_reserved integer;
  v_item_name text;
BEGIN
  IF p_inventory_item_id IS NULL OR COALESCE(p_extra_quantity, 0) <= 0 THEN
    RETURN;
  END IF;

  SELECT COALESCE(quantity, 0), item_name
  INTO v_physical, v_item_name
  FROM public.inventory
  WHERE id = p_inventory_item_id
  FOR UPDATE;

  IF v_item_name IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  SELECT COALESCE(SUM(GREATEST(COALESCE(ci.target_quantity, 0), 0)), 0)::integer
  INTO v_reserved
  FROM public.service_checklists sc
  JOIN public.services s ON s.id = sc.service_id
  JOIN public.checklists c ON c.id = sc.checklist_id
  JOIN public.checklist_items ci ON ci.checklist_id = c.id
  WHERE c.checklist_type = 'saida'
    AND ci.inventory_item_id = p_inventory_item_id
    AND (p_excluded_checklist_item_id IS NULL OR ci.id <> p_excluded_checklist_item_id)
    AND s.logistics_inventory_dispatched_at IS NULL
    AND COALESCE(s.operational_status, 'planning') <> 'completed';

  IF v_reserved + p_extra_quantity > v_physical THEN
    RAISE EXCEPTION 'Insufficient available stock for %: physical %, already reserved %, requested %',
      v_item_name, v_physical, v_reserved, p_extra_quantity
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_checklist_item_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_count integer;
  v_is_dispatch boolean;
BEGIN
  SELECT checklist_type = 'saida' INTO v_is_dispatch
  FROM public.checklists WHERE id = NEW.checklist_id;

  IF COALESCE(v_is_dispatch, false) AND NEW.inventory_item_id IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_service_count
    FROM public.service_checklists sc
    JOIN public.services s ON s.id = sc.service_id
    WHERE sc.checklist_id = NEW.checklist_id
      AND s.logistics_inventory_dispatched_at IS NULL
      AND COALESCE(s.operational_status, 'planning') <> 'completed';

    PERFORM public.assert_inventory_reservation_capacity(
      NEW.inventory_item_id,
      GREATEST(COALESCE(NEW.target_quantity, 0), 0) * v_service_count,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_checklist_item_reservation_trigger ON public.checklist_items;
CREATE TRIGGER validate_checklist_item_reservation_trigger
BEFORE INSERT OR UPDATE OF checklist_id, inventory_item_id, target_quantity
ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION public.validate_checklist_item_reservation();

CREATE OR REPLACE FUNCTION public.validate_service_checklist_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_is_active boolean;
BEGIN
  SELECT logistics_inventory_dispatched_at IS NULL
      AND COALESCE(operational_status, 'planning') <> 'completed'
  INTO v_is_active
  FROM public.services WHERE id = NEW.service_id;

  IF COALESCE(v_is_active, false) THEN
    FOR v_item IN
      SELECT ci.inventory_item_id, SUM(GREATEST(COALESCE(ci.target_quantity, 0), 0))::integer AS quantity
      FROM public.checklists c
      JOIN public.checklist_items ci ON ci.checklist_id = c.id
      WHERE c.id = NEW.checklist_id
        AND c.checklist_type = 'saida'
        AND ci.inventory_item_id IS NOT NULL
      GROUP BY ci.inventory_item_id
    LOOP
      PERFORM public.assert_inventory_reservation_capacity(v_item.inventory_item_id, v_item.quantity, NULL);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_service_checklist_reservation_trigger ON public.service_checklists;
CREATE TRIGGER validate_service_checklist_reservation_trigger
BEFORE INSERT ON public.service_checklists
FOR EACH ROW EXECUTE FUNCTION public.validate_service_checklist_reservation();

CREATE OR REPLACE FUNCTION public.validate_checklist_type_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_service_count integer;
BEGIN
  IF OLD.checklist_type <> 'saida' AND NEW.checklist_type = 'saida' THEN
    SELECT COUNT(*)::integer INTO v_service_count
    FROM public.service_checklists sc
    JOIN public.services s ON s.id = sc.service_id
    WHERE sc.checklist_id = NEW.id
      AND s.logistics_inventory_dispatched_at IS NULL
      AND COALESCE(s.operational_status, 'planning') <> 'completed';

    FOR v_item IN
      SELECT inventory_item_id, SUM(GREATEST(COALESCE(target_quantity, 0), 0))::integer AS quantity
      FROM public.checklist_items
      WHERE checklist_id = NEW.id AND inventory_item_id IS NOT NULL
      GROUP BY inventory_item_id
    LOOP
      PERFORM public.assert_inventory_reservation_capacity(
        v_item.inventory_item_id,
        v_item.quantity * v_service_count,
        NULL
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_checklist_type_reservation_trigger ON public.checklists;
CREATE TRIGGER validate_checklist_type_reservation_trigger
BEFORE UPDATE OF checklist_type ON public.checklists
FOR EACH ROW EXECUTE FUNCTION public.validate_checklist_type_reservation();

GRANT SELECT ON public.service_inventory_reservations TO authenticated;
GRANT SELECT ON public.inventory_stock_availability TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_stock_availability(uuid) TO authenticated;

COMMENT ON VIEW public.service_inventory_reservations IS
  'Reservas automáticas de estoque geradas por checklists de saída vinculados a JBRs ainda não liberados.';
COMMENT ON VIEW public.inventory_stock_availability IS
  'Saldo físico, reservado e disponível do inventário sem alterar o saldo físico antes da logística.';
