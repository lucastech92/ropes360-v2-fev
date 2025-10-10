-- Create table for employee folders
CREATE TABLE public.employee_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  folder_id text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.employee_folders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can view employee folders"
ON public.employee_folders
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create employee folders"
ON public.employee_folders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete employee folders"
ON public.employee_folders
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Insert existing employees
INSERT INTO public.employee_folders (name, folder_id) VALUES
  ('Lucas Carneiro', 'lucas-carneiro'),
  ('Lucas Soares', 'lucas-soares');