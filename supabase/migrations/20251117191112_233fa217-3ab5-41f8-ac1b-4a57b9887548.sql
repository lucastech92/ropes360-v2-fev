-- Recreate the inventory trigger with role-based security
CREATE OR REPLACE FUNCTION public.update_inventory_from_checklist()
RETURNS TRIGGER AS $$
DECLARE
  v_checklist_type TEXT;
  v_user_role TEXT;
BEGIN
  -- Check if the user has admin or moderator role
  SELECT role INTO v_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role IN ('admin', 'moderator')
  LIMIT 1;

  -- If user is not admin or moderator, prevent inventory updates
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Apenas administradores e moderadores podem criar/editar checklists que afetam o inventário';
  END IF;

  -- Get the checklist type
  SELECT checklist_type INTO v_checklist_type
  FROM public.checklists
  WHERE id = NEW.checklist_id;

  IF NEW.inventory_item_id IS NOT NULL THEN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
      IF (TG_OP = 'INSERT') THEN
        IF v_checklist_type = 'saida' THEN
          UPDATE public.inventory
          SET quantity = quantity - NEW.current_quantity
          WHERE id = NEW.inventory_item_id;
        ELSE
          UPDATE public.inventory
          SET quantity = quantity + NEW.current_quantity
          WHERE id = NEW.inventory_item_id;
        END IF;
      ELSIF (TG_OP = 'UPDATE') THEN
        DECLARE
          v_quantity_diff INTEGER;
        BEGIN
          v_quantity_diff := NEW.current_quantity - OLD.current_quantity;
          
          IF v_checklist_type = 'saida' THEN
            UPDATE public.inventory
            SET quantity = quantity - v_quantity_diff
            WHERE id = NEW.inventory_item_id;
          ELSE
            UPDATE public.inventory
            SET quantity = quantity + v_quantity_diff
            WHERE id = NEW.inventory_item_id;
          END IF;
        END;
      END IF;
    ELSIF (TG_OP = 'DELETE') THEN
      -- Check role for DELETE as well
      SELECT role INTO v_user_role
      FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      LIMIT 1;

      IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Apenas administradores e moderadores podem deletar itens de checklist que afetam o inventário';
      END IF;

      IF v_checklist_type = 'saida' THEN
        UPDATE public.inventory
        SET quantity = quantity + OLD.current_quantity
        WHERE id = OLD.inventory_item_id;
      ELSE
        UPDATE public.inventory
        SET quantity = quantity - OLD.current_quantity
        WHERE id = OLD.inventory_item_id;
      END IF;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;