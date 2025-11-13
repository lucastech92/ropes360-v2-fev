-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_jbr TEXT NOT NULL,
  cliente TEXT NOT NULL,
  escopo TEXT,
  equipamentos TEXT,
  data_inicio DATE,
  data_termino DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view services
CREATE POLICY "All authenticated can view services"
ON public.services
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- All authenticated users can create services
CREATE POLICY "All authenticated can create services"
ON public.services
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- All authenticated users can update services
CREATE POLICY "All authenticated can update services"
ON public.services
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Only admins can delete services
CREATE POLICY "Only admins can delete services"
ON public.services
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();