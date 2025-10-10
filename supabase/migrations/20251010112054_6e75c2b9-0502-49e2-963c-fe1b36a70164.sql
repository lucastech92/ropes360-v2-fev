-- Add expiry_date column to documents table
ALTER TABLE public.documents
ADD COLUMN expiry_date date;

-- Create index for better performance on expiry queries
CREATE INDEX idx_documents_expiry_date ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Create a view for documents expiring soon (within 30 days)
CREATE OR REPLACE VIEW public.documents_expiring_soon AS
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