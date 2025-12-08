-- Criar tabela para armazenar histórico de consumo de inventário
CREATE TABLE public.inventory_consumption_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('consumption', 'restock', 'adjustment')),
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_consumption_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "All authenticated can view consumption history"
ON public.inventory_consumption_history
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert consumption history"
ON public.inventory_consumption_history
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can delete consumption history"
ON public.inventory_consumption_history
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar tabela para armazenar previsões geradas pela IA
CREATE TABLE public.inventory_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('restock_date', 'consumption_trend', 'demand_spike')),
  predicted_value JSONB NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "All authenticated can view predictions"
ON public.inventory_predictions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage predictions"
ON public.inventory_predictions
FOR ALL
USING (true);

-- Criar trigger para registrar mudanças automáticas no inventário
CREATE OR REPLACE FUNCTION public.log_inventory_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if quantity actually changed
  IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    INSERT INTO public.inventory_consumption_history (
      inventory_item_id,
      quantity_change,
      change_type,
      previous_quantity,
      new_quantity,
      created_by
    ) VALUES (
      NEW.id,
      NEW.quantity - OLD.quantity,
      CASE 
        WHEN NEW.quantity > OLD.quantity THEN 'restock'
        WHEN NEW.quantity < OLD.quantity THEN 'consumption'
        ELSE 'adjustment'
      END,
      OLD.quantity,
      NEW.quantity,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER log_inventory_changes
AFTER UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.log_inventory_consumption();