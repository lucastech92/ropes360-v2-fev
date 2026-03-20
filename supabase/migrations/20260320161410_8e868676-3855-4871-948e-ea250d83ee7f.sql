
-- Add is_saved column to checklists table for archiving/saving completed checklists
ALTER TABLE public.checklists ADD COLUMN is_saved boolean NOT NULL DEFAULT false;

-- Add saved_at timestamp to track when it was saved
ALTER TABLE public.checklists ADD COLUMN saved_at timestamp with time zone DEFAULT NULL;
