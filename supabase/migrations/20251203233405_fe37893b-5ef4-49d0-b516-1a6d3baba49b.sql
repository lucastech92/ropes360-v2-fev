-- Create equipment status enum
CREATE TYPE equipment_status AS ENUM (
  'available',
  'in_service',
  'maintenance',
  'calibration',
  'inactive'
);

-- Create equipment condition enum
CREATE TYPE equipment_condition AS ENUM (
  'excellent',
  'good',
  'fair',
  'needs_repair',
  'damaged'
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  category TEXT NOT NULL,
  acquisition_date DATE,
  last_calibration DATE,
  next_calibration DATE,
  calibration_interval_months INTEGER,
  status equipment_status DEFAULT 'available',
  condition equipment_condition DEFAULT 'good',
  current_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  current_location TEXT DEFAULT 'Base',
  inventory_item_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create equipment allocations table (movement history)
CREATE TABLE public.equipment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  checkout_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_by UUID NOT NULL REFERENCES auth.users(id),
  condition_on_checkout equipment_condition NOT NULL,
  checkout_notes TEXT,
  checkin_date TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id),
  condition_on_checkin equipment_condition,
  checkin_notes TEXT,
  destination TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add equipment_id to maintenance_records
ALTER TABLE public.maintenance_records 
ADD COLUMN equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_allocations ENABLE ROW LEVEL SECURITY;

-- Equipment policies
CREATE POLICY "All authenticated can view equipment" 
ON public.equipment FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and moderators can create equipment" 
ON public.equipment FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins and moderators can update equipment" 
ON public.equipment FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Only admins can delete equipment" 
ON public.equipment FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Equipment allocations policies
CREATE POLICY "All authenticated can view allocations" 
ON public.equipment_allocations FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create allocations" 
ON public.equipment_allocations FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can update allocations" 
ON public.equipment_allocations FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete allocations" 
ON public.equipment_allocations FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_equipment_status ON public.equipment(status);
CREATE INDEX idx_equipment_category ON public.equipment(category);
CREATE INDEX idx_equipment_next_calibration ON public.equipment(next_calibration);
CREATE INDEX idx_allocations_equipment_id ON public.equipment_allocations(equipment_id);
CREATE INDEX idx_allocations_service_id ON public.equipment_allocations(service_id);