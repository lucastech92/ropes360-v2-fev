-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_from_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checklist_type TEXT;
BEGIN
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
$$;