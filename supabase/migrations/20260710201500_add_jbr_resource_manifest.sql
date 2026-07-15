-- Sprint 2: manifesto operacional de recursos por JBR.
CREATE TABLE IF NOT EXISTS public.service_resource_manifest_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory(id),
  planned_quantity integer NOT NULL CHECK (planned_quantity > 0),
  dispatched_quantity integer NOT NULL DEFAULT 0 CHECK (dispatched_quantity >= 0),
  returned_quantity integer,
  consumed_quantity integer NOT NULL DEFAULT 0 CHECK (consumed_quantity >= 0),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'dispatched', 'returned', 'cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_service_resource_manifest_service
  ON public.service_resource_manifest_items(service_id);

ALTER TABLE public.service_resource_manifest_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service resource manifests"
  ON public.service_resource_manifest_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create service resource manifests"
  ON public.service_resource_manifest_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update service resource manifests"
  ON public.service_resource_manifest_items FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.upsert_service_resource_manifest(
  p_service_id uuid,
  p_inventory_item_id uuid,
  p_planned_quantity integer,
  p_notes text DEFAULT NULL
)
RETURNS public.service_resource_manifest_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_quantity integer;
  result public.service_resource_manifest_items;
BEGIN
  IF p_planned_quantity <= 0 THEN
    RAISE EXCEPTION 'Planned quantity must be greater than zero';
  END IF;

  SELECT i.quantity - COALESCE(SUM(
    CASE WHEN m.status IN ('planned', 'dispatched') THEN m.planned_quantity ELSE 0 END
  ), 0)
  INTO available_quantity
  FROM public.inventory i
  LEFT JOIN public.service_resource_manifest_items m
    ON m.inventory_item_id = i.id
    AND m.service_id <> p_service_id
  WHERE i.id = p_inventory_item_id
  GROUP BY i.id, i.quantity;

  IF available_quantity IS NULL OR available_quantity < p_planned_quantity THEN
    RAISE EXCEPTION 'Insufficient availability for this resource';
  END IF;

  INSERT INTO public.service_resource_manifest_items (
    service_id, inventory_item_id, planned_quantity, notes, created_by
  )
  VALUES (p_service_id, p_inventory_item_id, p_planned_quantity, p_notes, auth.uid())
  ON CONFLICT (service_id, inventory_item_id) DO UPDATE
  SET planned_quantity = EXCLUDED.planned_quantity,
      notes = EXCLUDED.notes,
      updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_service_resource_manifest(
  p_manifest_id uuid,
  p_dispatched_quantity integer
)
RETURNS public.service_resource_manifest_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.service_resource_manifest_items;
BEGIN
  UPDATE public.service_resource_manifest_items
  SET dispatched_quantity = p_dispatched_quantity,
      status = 'dispatched',
      updated_at = now()
  WHERE id = p_manifest_id
    AND p_dispatched_quantity > 0
    AND p_dispatched_quantity <= planned_quantity
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'Dispatched quantity must be between 1 and the planned quantity';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.return_service_resource_manifest(
  p_manifest_id uuid,
  p_returned_quantity integer,
  p_consumed_quantity integer,
  p_notes text DEFAULT NULL
)
RETURNS public.service_resource_manifest_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.service_resource_manifest_items;
  resource_type public.item_type;
  quantity_leaving_stock integer;
BEGIN
  SELECT i.item_type
  INTO resource_type
  FROM public.service_resource_manifest_items m
  JOIN public.inventory i ON i.id = m.inventory_item_id
  WHERE m.id = p_manifest_id;

  UPDATE public.service_resource_manifest_items
  SET returned_quantity = p_returned_quantity,
      consumed_quantity = p_consumed_quantity,
      notes = COALESCE(p_notes, notes),
      status = 'returned',
      updated_at = now()
  WHERE id = p_manifest_id
    AND p_returned_quantity >= 0
    AND p_consumed_quantity >= 0
    AND p_returned_quantity + p_consumed_quantity <= dispatched_quantity
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'Returned plus consumed quantity cannot exceed dispatched quantity';
  END IF;

  quantity_leaving_stock := result.dispatched_quantity - result.returned_quantity;

  IF resource_type = 'consumivel' THEN
    UPDATE public.inventory
    SET quantity = GREATEST(0, quantity - quantity_leaving_stock),
        last_updated = now()
    WHERE id = result.inventory_item_id;
  ELSIF result.returned_quantity < result.dispatched_quantity THEN
    UPDATE public.inventory
    SET status = 'inactive',
        last_updated = now()
    WHERE id = result.inventory_item_id;
  ELSE
    UPDATE public.inventory
    SET status = 'available',
        current_location = 'Base',
        last_updated = now()
    WHERE id = result.inventory_item_id;
  END IF;

  RETURN result;
END;
$$;
