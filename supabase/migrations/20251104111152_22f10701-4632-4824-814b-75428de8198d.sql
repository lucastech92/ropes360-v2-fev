-- Create maintenance_records table
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_name TEXT NOT NULL,
  equipment_code TEXT NOT NULL,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventiva', 'corretiva', 'preditiva')),
  priority TEXT NOT NULL CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  status TEXT NOT NULL CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  scheduled_date DATE NOT NULL,
  completion_date DATE,
  technician TEXT NOT NULL,
  description TEXT NOT NULL,
  actions_taken TEXT,
  parts_used TEXT,
  hours_spent NUMERIC(5,2),
  cost NUMERIC(10,2),
  next_maintenance DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view maintenance records"
  ON public.maintenance_records
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create maintenance records"
  ON public.maintenance_records
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update maintenance records"
  ON public.maintenance_records
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete maintenance records"
  ON public.maintenance_records
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_maintenance_records_updated_at
  BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_maintenance_records_status ON public.maintenance_records(status);
CREATE INDEX idx_maintenance_records_type ON public.maintenance_records(maintenance_type);
CREATE INDEX idx_maintenance_records_scheduled_date ON public.maintenance_records(scheduled_date);
CREATE INDEX idx_maintenance_records_equipment_code ON public.maintenance_records(equipment_code);