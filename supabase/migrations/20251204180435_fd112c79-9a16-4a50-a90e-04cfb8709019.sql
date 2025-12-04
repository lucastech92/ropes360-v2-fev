-- Add item_type enum
DO $$ BEGIN
  CREATE TYPE item_type AS ENUM ('consumivel', 'equipamento');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add equipment-related columns to inventory table
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS item_type item_type NOT NULL DEFAULT 'consumivel',
ADD COLUMN IF NOT EXISTS code text,
ADD COLUMN IF NOT EXISTS serial_number text,
ADD COLUMN IF NOT EXISTS manufacturer text,
ADD COLUMN IF NOT EXISTS model text,
ADD COLUMN IF NOT EXISTS status equipment_status DEFAULT 'available',
ADD COLUMN IF NOT EXISTS condition equipment_condition DEFAULT 'good',
ADD COLUMN IF NOT EXISTS acquisition_date date,
ADD COLUMN IF NOT EXISTS last_calibration date,
ADD COLUMN IF NOT EXISTS next_calibration date,
ADD COLUMN IF NOT EXISTS calibration_interval_months integer,
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS current_location text DEFAULT 'Base';

-- Add inventory_item_id to maintenance_records for linking
ALTER TABLE public.maintenance_records
ADD COLUMN IF NOT EXISTS inventory_item_id uuid REFERENCES public.inventory(id);

-- Create inventory_allocations table (similar to equipment_allocations but for unified inventory)
CREATE TABLE IF NOT EXISTS public.inventory_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory(id),
  service_id uuid REFERENCES public.services(id),
  checkout_date timestamp with time zone NOT NULL DEFAULT now(),
  checked_out_by uuid NOT NULL,
  condition_on_checkout equipment_condition NOT NULL,
  checkout_notes text,
  destination text,
  checkin_date timestamp with time zone,
  checked_in_by uuid,
  condition_on_checkin equipment_condition,
  checkin_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on inventory_allocations
ALTER TABLE public.inventory_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_allocations
CREATE POLICY "All authenticated can view allocations"
ON public.inventory_allocations FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create allocations"
ON public.inventory_allocations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can update allocations"
ON public.inventory_allocations FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete allocations"
ON public.inventory_allocations FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing equipment data to inventory
INSERT INTO public.inventory (
  item_name, category, quantity, unit, location, notes, item_type, code, serial_number,
  manufacturer, model, status, condition, acquisition_date, last_calibration,
  next_calibration, calibration_interval_months, photo_url, current_location
)
SELECT 
  name, category, 1, 'un', current_location, notes, 'equipamento'::item_type, code, serial_number,
  manufacturer, model, status, condition, acquisition_date, last_calibration,
  next_calibration, calibration_interval_months, photo_url, current_location
FROM public.equipment
ON CONFLICT DO NOTHING;

-- Create unique constraint on code for equipment items
CREATE UNIQUE INDEX IF NOT EXISTS inventory_code_unique ON public.inventory(code) WHERE code IS NOT NULL;