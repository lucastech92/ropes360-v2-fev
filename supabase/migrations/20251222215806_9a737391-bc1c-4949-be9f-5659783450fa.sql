-- Adicionar colunas para melhor rastreabilidade no histórico de consumo
ALTER TABLE public.inventory_consumption_history 
ADD COLUMN IF NOT EXISTS item_name text,
ADD COLUMN IF NOT EXISTS checklist_id uuid REFERENCES public.checklists(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS action_source text DEFAULT 'manual';

-- Criar índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_inventory_consumption_history_item_id ON public.inventory_consumption_history(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_consumption_history_created_at ON public.inventory_consumption_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_consumption_history_checklist_id ON public.inventory_consumption_history(checklist_id);
CREATE INDEX IF NOT EXISTS idx_inventory_consumption_history_action_source ON public.inventory_consumption_history(action_source);

-- Atualizar o trigger para incluir o nome do item automaticamente
CREATE OR REPLACE FUNCTION public.log_inventory_consumption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if quantity actually changed
  IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    INSERT INTO public.inventory_consumption_history (
      inventory_item_id,
      item_name,
      quantity_change,
      change_type,
      previous_quantity,
      new_quantity,
      created_by,
      action_source
    ) VALUES (
      NEW.id,
      NEW.item_name,
      NEW.quantity - OLD.quantity,
      CASE 
        WHEN NEW.quantity > OLD.quantity THEN 'restock'
        WHEN NEW.quantity < OLD.quantity THEN 'consumption'
        ELSE 'adjustment'
      END,
      OLD.quantity,
      NEW.quantity,
      auth.uid(),
      COALESCE(current_setting('app.action_source', true), 'manual')
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Preencher item_name para registros existentes
UPDATE public.inventory_consumption_history h
SET item_name = i.item_name
FROM public.inventory i
WHERE h.inventory_item_id = i.id
AND h.item_name IS NULL;