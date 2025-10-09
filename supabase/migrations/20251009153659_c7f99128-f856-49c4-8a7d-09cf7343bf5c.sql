-- Add employee_folder column to documents table
ALTER TABLE public.documents 
ADD COLUMN employee_folder text;

-- Add index for better query performance
CREATE INDEX idx_documents_employee_folder ON public.documents(employee_folder);