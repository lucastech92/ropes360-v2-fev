
-- Enum for file types in inspection packages
CREATE TYPE public.inspection_file_type AS ENUM ('certificate', 'slb_mrt', 'report', 'other');

-- Inspection packages table
CREATE TABLE public.inspection_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tag_number TEXT NOT NULL UNIQUE,
  client TEXT NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  description TEXT,
  inspection_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspection_packages_tag ON public.inspection_packages(tag_number);
CREATE INDEX idx_inspection_packages_client ON public.inspection_packages(client);
CREATE INDEX idx_inspection_packages_service ON public.inspection_packages(service_id);

ALTER TABLE public.inspection_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view inspection packages"
ON public.inspection_packages FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own inspection packages"
ON public.inspection_packages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packages, admins all"
ON public.inspection_packages FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Only admins can delete inspection packages"
ON public.inspection_packages FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_inspection_packages_updated_at
BEFORE UPDATE ON public.inspection_packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inspection package files table
CREATE TABLE public.inspection_package_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.inspection_packages(id) ON DELETE CASCADE,
  file_type public.inspection_file_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_package_files_package ON public.inspection_package_files(package_id);

ALTER TABLE public.inspection_package_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view package files"
ON public.inspection_package_files FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can upload package files"
ON public.inspection_package_files FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete package files"
ON public.inspection_package_files FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for inspection_packages folder in documents bucket
CREATE POLICY "Authenticated can view inspection package files in storage"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'inspection_packages');

CREATE POLICY "Authenticated can upload inspection package files to storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'inspection_packages');

CREATE POLICY "Admins can delete inspection package files in storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'inspection_packages' AND has_role(auth.uid(), 'admin'::app_role));
