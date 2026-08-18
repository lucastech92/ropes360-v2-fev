-- Reserva "soft" de estoque: checklists de saída ativos reservam o saldo planejado
-- mesmo antes de serem vinculados a um JBR. O que já foi baixado (dispatch) não conta duas vezes.

CREATE OR REPLACE VIEW public.inventory_stock_availability
WITH (security_invoker = true)
AS
WITH dispatched AS (
  SELECT source_checklist_item_id, SUM(dispatched_quantity)::integer AS dispatched_quantity
  FROM public.service_dispatch_items
  GROUP BY source_checklist_item_id
),
reservations AS (
  SELECT ci.inventory_item_id,
         SUM(GREATEST(COALESCE(ci.target_quantity, 0) - COALESCE(d.dispatched_quantity, 0), 0))::integer AS reserved_quantity
  FROM public.checklist_items ci
  JOIN public.checklists c ON c.id = ci.checklist_id
  LEFT JOIN dispatched d ON d.source_checklist_item_id = ci.id
  WHERE ci.inventory_item_id IS NOT NULL
    AND c.checklist_type = 'saida'
    AND COALESCE(c.is_template, false) = false
    AND COALESCE(c.is_saved, false) = false
  GROUP BY ci.inventory_item_id
)
SELECT
  i.id AS inventory_item_id,
  COALESCE(i.quantity, 0)::integer AS physical_quantity,
  COALESCE(r.reserved_quantity, 0)::integer AS reserved_quantity,
  GREATEST(COALESCE(i.quantity, 0) - COALESCE(r.reserved_quantity, 0), 0)::integer AS available_quantity
FROM public.inventory i
LEFT JOIN reservations r ON r.inventory_item_id = i.id;

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
  WITH dispatched AS (
    SELECT source_checklist_item_id, SUM(dispatched_quantity)::integer AS dispatched_quantity
    FROM public.service_dispatch_items
    GROUP BY source_checklist_item_id
  ),
  pending AS (
    SELECT ci.inventory_item_id,
           GREATEST(COALESCE(ci.target_quantity, 0) - COALESCE(d.dispatched_quantity, 0), 0)::integer AS pending_quantity,
           sc.service_id
    FROM public.checklist_items ci
    JOIN public.checklists c ON c.id = ci.checklist_id
    LEFT JOIN dispatched d ON d.source_checklist_item_id = ci.id
    LEFT JOIN public.service_checklists sc ON sc.checklist_id = c.id
    WHERE ci.inventory_item_id IS NOT NULL
      AND c.checklist_type = 'saida'
      AND COALESCE(c.is_template, false) = false
      AND COALESCE(c.is_saved, false) = false
  ),
  reservations AS (
    SELECT inventory_item_id,
           SUM(pending_quantity)::integer AS reserved_quantity,
           SUM(CASE WHEN p_service_id IS NOT NULL AND service_id = p_service_id THEN pending_quantity ELSE 0 END)::integer AS reserved_for_service
    FROM pending
    GROUP BY inventory_item_id
  )
  SELECT
    i.id,
    i.item_name,
    COALESCE(i.quantity, 0)::integer,
    i.unit,
    i.status,
    i.next_calibration,
    COALESCE(i.quantity, 0)::integer,
    COALESCE(r.reserved_quantity, 0)::integer,
    COALESCE(r.reserved_for_service, 0)::integer,
    GREATEST(
      COALESCE(i.quantity, 0)
        - COALESCE(r.reserved_quantity, 0)
        + COALESCE(r.reserved_for_service, 0),
      0
    )::integer
  FROM public.inventory i
  LEFT JOIN reservations r ON r.inventory_item_id = i.id
  ORDER BY i.item_name;
$$;

GRANT SELECT ON public.inventory_stock_availability TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_stock_availability(uuid) TO authenticated;

COMMENT ON VIEW public.inventory_stock_availability IS
  'Saldo físico, reservado por checklists de saída ativos (mesmo sem JBR) e disponível.';