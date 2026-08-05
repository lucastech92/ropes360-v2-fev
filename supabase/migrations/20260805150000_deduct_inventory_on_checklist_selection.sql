-- A baixa do inventário passa a acompanhar current_quantity do checklist.
-- Vincular ou adicionar um item com quantidade 0 não altera o saldo.

CREATE OR REPLACE FUNCTION public.sync_service_checklist_item_stock(
  p_service_id uuid,
  p_checklist_id uuid,
  p_checklist_item_id uuid,
  p_inventory_item_id uuid,
  p_selected_quantity integer,
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
  v_dispatch public.service_dispatch_items;
  v_inventory public.inventory;
  v_checklist_name text;
  v_existing_quantity integer := 0;
  v_desired_quantity integer := 0;
  v_delta integer;
  v_previous_quantity integer;
  v_new_quantity integer;
BEGIN
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'JBR not found';
  END IF;

  IF v_service.logistics_released_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot change inventory quantities after the JBR logistics release';
  END IF;

  SELECT * INTO v_dispatch
  FROM public.service_dispatch_items
  WHERE service_id = p_service_id
    AND source_checklist_item_id = p_checklist_item_id
  FOR UPDATE;

  -- Se o item de inventário mudou, devolve integralmente a seleção anterior.
  IF v_dispatch.id IS NOT NULL
     AND v_dispatch.inventory_item_id IS DISTINCT FROM p_inventory_item_id THEN
    PERFORM public.refund_service_dispatch_item(
      v_dispatch.id,
      COALESCE(p_actor, auth.uid()),
      'Estorno automático por troca do item de inventário no checklist'
    );
    v_dispatch.id := NULL;
  END IF;

  IF v_dispatch.id IS NOT NULL THEN
    v_existing_quantity := v_dispatch.dispatched_quantity;
  END IF;

  v_desired_quantity := CASE
    WHEN p_inventory_item_id IS NULL THEN 0
    ELSE GREATEST(COALESCE(p_selected_quantity, 0), 0)
  END;

  IF v_desired_quantity = v_existing_quantity THEN
    RETURN;
  END IF;

  IF v_desired_quantity > v_existing_quantity THEN
    v_delta := v_desired_quantity - v_existing_quantity;

    SELECT * INTO v_inventory
    FROM public.inventory
    WHERE id = p_inventory_item_id
    FOR UPDATE;

    IF v_inventory.id IS NULL THEN
      RAISE EXCEPTION 'Inventory item not found';
    END IF;

    v_previous_quantity := COALESCE(v_inventory.quantity, 0);
    IF v_previous_quantity < v_delta THEN
      RAISE EXCEPTION 'Insufficient stock for inventory item %: available %, requested %',
        p_inventory_item_id, v_previous_quantity, v_delta;
    END IF;

    v_new_quantity := v_previous_quantity - v_delta;

    UPDATE public.inventory
    SET quantity = v_new_quantity,
        status = CASE WHEN item_type = 'equipamento' AND v_new_quantity = 0 THEN 'in_service' ELSE status END,
        current_location = CASE WHEN item_type = 'equipamento' AND v_new_quantity = 0 THEN v_service.codigo_jbr ELSE current_location END,
        last_updated = now()
    WHERE id = p_inventory_item_id;

    IF v_dispatch.id IS NULL THEN
      SELECT name INTO v_checklist_name
      FROM public.checklists
      WHERE id = p_checklist_id;

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
        v_desired_quantity,
        COALESCE(p_actor, auth.uid())
      );
    ELSE
      UPDATE public.service_dispatch_items
      SET dispatched_quantity = v_desired_quantity,
          item_name = COALESCE(p_item_name, item_name)
      WHERE id = v_dispatch.id;
    END IF;

    INSERT INTO public.service_inventory_movements (
      service_id, inventory_item_id, movement_type, quantity,
      previous_quantity, new_quantity, notes, created_by
    ) VALUES (
      p_service_id, p_inventory_item_id, 'dispatch', v_delta,
      v_previous_quantity, v_new_quantity,
      'Baixa automática ao selecionar quantidade no checklist',
      COALESCE(p_actor, auth.uid())
    );
  ELSE
    v_delta := v_existing_quantity - v_desired_quantity;

    SELECT * INTO v_inventory
    FROM public.inventory
    WHERE id = v_dispatch.inventory_item_id
    FOR UPDATE;

    IF v_inventory.id IS NULL THEN
      RAISE EXCEPTION 'Inventory item not found';
    END IF;

    v_previous_quantity := COALESCE(v_inventory.quantity, 0);
    v_new_quantity := v_previous_quantity + v_delta;

    UPDATE public.inventory
    SET quantity = v_new_quantity,
        status = CASE WHEN item_type = 'equipamento' THEN 'available' ELSE status END,
        current_location = CASE WHEN item_type = 'equipamento' THEN 'Base' ELSE current_location END,
        last_updated = now()
    WHERE id = v_dispatch.inventory_item_id;

    IF v_desired_quantity = 0 THEN
      DELETE FROM public.service_dispatch_items WHERE id = v_dispatch.id;
    ELSE
      UPDATE public.service_dispatch_items
      SET dispatched_quantity = v_desired_quantity
      WHERE id = v_dispatch.id;
    END IF;

    INSERT INTO public.service_inventory_movements (
      service_id, inventory_item_id, movement_type, quantity,
      previous_quantity, new_quantity, notes, created_by
    ) VALUES (
      p_service_id, v_dispatch.inventory_item_id, 'return', v_delta,
      v_previous_quantity, v_new_quantity,
      'Estorno automático ao reduzir quantidade no checklist',
      COALESCE(p_actor, auth.uid())
    );
  END IF;
END;
$$;

-- Vincular um checklist só aplica quantidades que já tenham sido selecionadas.
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
    SELECT ci.id, ci.inventory_item_id, ci.current_quantity, ci.item_text
    FROM public.checklists c
    JOIN public.checklist_items ci ON ci.checklist_id = c.id
    WHERE c.id = NEW.checklist_id
      AND c.checklist_type = 'saida'
      AND ci.inventory_item_id IS NOT NULL
      AND COALESCE(ci.current_quantity, 0) > 0
    ORDER BY ci.order_index, ci.id
  LOOP
    PERFORM public.sync_service_checklist_item_stock(
      NEW.service_id,
      NEW.checklist_id,
      v_item.id,
      v_item.inventory_item_id,
      v_item.current_quantity,
      v_item.item_text,
      auth.uid()
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Cada clique em + ou - sincroniza a diferença com o inventário.
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
    PERFORM public.sync_service_checklist_item_stock(
      v_link.service_id,
      NEW.checklist_id,
      NEW.id,
      NEW.inventory_item_id,
      NEW.current_quantity,
      NEW.item_text,
      auth.uid()
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_stock_when_linked_checklist_item_saved_trigger ON public.checklist_items;
CREATE TRIGGER apply_stock_when_linked_checklist_item_saved_trigger
AFTER INSERT OR UPDATE OF current_quantity, inventory_item_id ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_when_linked_checklist_item_saved();

-- A troca do alvo planejado não movimenta mais estoque.
DROP TRIGGER IF EXISTS refund_stock_before_linked_checklist_item_update_trigger ON public.checklist_items;

-- Converte JBRs ainda não liberados: o saldo passa de target_quantity para current_quantity.
DO $$
DECLARE
  v_item record;
BEGIN
  FOR v_item IN
    SELECT
      sc.service_id,
      c.id AS checklist_id,
      ci.id AS checklist_item_id,
      ci.inventory_item_id,
      ci.current_quantity,
      ci.item_text,
      s.created_by
    FROM public.service_checklists sc
    JOIN public.services s ON s.id = sc.service_id
    JOIN public.checklists c ON c.id = sc.checklist_id
    JOIN public.checklist_items ci ON ci.checklist_id = c.id
    WHERE s.logistics_released_at IS NULL
      AND c.checklist_type = 'saida'
    ORDER BY sc.created_at, sc.id, ci.order_index, ci.id
  LOOP
    PERFORM public.sync_service_checklist_item_stock(
      v_item.service_id,
      v_item.checklist_id,
      v_item.checklist_item_id,
      v_item.inventory_item_id,
      v_item.current_quantity,
      v_item.item_text,
      v_item.created_by
    );
  END LOOP;
END;
$$;

-- Funções internas só podem ser executadas pelos gatilhos SECURITY DEFINER.
REVOKE EXECUTE ON FUNCTION public.apply_service_checklist_item_stock(uuid, uuid, uuid, uuid, integer, text, uuid)
  FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_service_dispatch_item(uuid, uuid, text)
  FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_service_checklist_item_stock(uuid, uuid, uuid, uuid, integer, text, uuid)
  FROM PUBLIC, authenticated;

COMMENT ON FUNCTION public.sync_service_checklist_item_stock(uuid, uuid, uuid, uuid, integer, text, uuid) IS
  'Sincroniza atomicamente o saldo do inventário com a quantidade selecionada em um item de checklist de saída.';
