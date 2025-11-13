-- Alter services table to support new fields
ALTER TABLE public.services 
  DROP COLUMN IF EXISTS escopo,
  ADD COLUMN escopo text[],
  ADD COLUMN outros_escopo text,
  ADD COLUMN aplicacao text;

COMMENT ON COLUMN public.services.escopo IS 'Array of selected scope options';
COMMENT ON COLUMN public.services.outros_escopo IS 'Custom scope text when "Outros" is selected';
COMMENT ON COLUMN public.services.aplicacao IS 'Application description';