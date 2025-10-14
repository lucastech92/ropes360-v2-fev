-- Fix security definer view issue by recreating with security_invoker
DROP VIEW IF EXISTS public.documents_expiring_soon;

CREATE OR REPLACE VIEW public.documents_expiring_soon
WITH (security_invoker = true) AS
SELECT 
  d.*,
  ef.name as employee_name,
  (d.expiry_date - CURRENT_DATE) as days_until_expiry
FROM public.documents d
LEFT JOIN public.employee_folders ef ON d.employee_folder = ef.folder_id
WHERE d.expiry_date IS NOT NULL 
  AND d.expiry_date >= CURRENT_DATE
  AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY d.expiry_date ASC;

-- Fix search_path for existing functions
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.log_document_operation() SET search_path = public;