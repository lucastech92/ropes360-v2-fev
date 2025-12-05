-- Add is_template column to checklists table
ALTER TABLE public.checklists ADD COLUMN is_template boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.checklists.is_template IS 'When true, this checklist serves as a template that can be cloned for new services';