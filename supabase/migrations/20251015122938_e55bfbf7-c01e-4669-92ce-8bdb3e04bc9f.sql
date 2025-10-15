-- Add type column to checklists table
ALTER TABLE public.checklists 
ADD COLUMN checklist_type TEXT NOT NULL DEFAULT 'saida' CHECK (checklist_type IN ('entrada', 'saida'));

-- Add inventory_item_id to checklist_items to link with inventory
ALTER TABLE public.checklist_items
ADD COLUMN inventory_item_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE;

-- Create function to update inventory when checklist item quantity changes
CREATE OR REPLACE FUNCTION public.update_inventory_from_checklist()
RETURNS TRIGGER AS $$
DECLARE
  v_checklist_type TEXT;
BEGIN
  -- Get the checklist type
  SELECT checklist_type INTO v_checklist_type
  FROM public.checklists
  WHERE id = NEW.checklist_id;

  -- Only update inventory if item is linked to inventory
  IF NEW.inventory_item_id IS NOT NULL THEN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
      -- Calculate the difference in quantity
      IF (TG_OP = 'INSERT') THEN
        -- On insert, update based on current quantity
        IF v_checklist_type = 'saida' THEN
          -- Subtract from inventory for saída
          UPDATE public.inventory
          SET quantity = quantity - NEW.current_quantity
          WHERE id = NEW.inventory_item_id;
        ELSE
          -- Add to inventory for entrada
          UPDATE public.inventory
          SET quantity = quantity + NEW.current_quantity
          WHERE id = NEW.inventory_item_id;
        END IF;
      ELSIF (TG_OP = 'UPDATE') THEN
        -- On update, calculate the difference
        DECLARE
          v_quantity_diff INTEGER;
        BEGIN
          v_quantity_diff := NEW.current_quantity - OLD.current_quantity;
          
          IF v_checklist_type = 'saida' THEN
            -- Subtract difference from inventory for saída
            UPDATE public.inventory
            SET quantity = quantity - v_quantity_diff
            WHERE id = NEW.inventory_item_id;
          ELSE
            -- Add difference to inventory for entrada
            UPDATE public.inventory
            SET quantity = quantity + v_quantity_diff
            WHERE id = NEW.inventory_item_id;
          END IF;
        END;
      END IF;
    ELSIF (TG_OP = 'DELETE') THEN
      -- On delete, reverse the operation
      IF v_checklist_type = 'saida' THEN
        -- Add back to inventory for saída
        UPDATE public.inventory
        SET quantity = quantity + OLD.current_quantity
        WHERE id = OLD.inventory_item_id;
      ELSE
        -- Subtract from inventory for entrada
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

-- Create trigger for inventory updates
DROP TRIGGER IF EXISTS trigger_update_inventory_from_checklist ON public.checklist_items;
CREATE TRIGGER trigger_update_inventory_from_checklist
AFTER INSERT OR UPDATE OR DELETE ON public.checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_from_checklist();