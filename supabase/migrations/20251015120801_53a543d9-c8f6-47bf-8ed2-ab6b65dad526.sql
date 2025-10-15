-- Add quantity and target_quantity columns to checklist_items
ALTER TABLE public.checklist_items 
ADD COLUMN IF NOT EXISTS target_quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_quantity integer DEFAULT 0;

-- Add comment to explain the columns
COMMENT ON COLUMN public.checklist_items.target_quantity IS 'Total quantity required for this item';
COMMENT ON COLUMN public.checklist_items.current_quantity IS 'Current quantity checked/completed';