-- Add local field to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS local text;

-- Create service_collaborators table
CREATE TABLE IF NOT EXISTS public.service_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'inspector',
  created_at timestamptz DEFAULT now(),
  UNIQUE(service_id, user_id)
);

-- Create service_checklists table
CREATE TABLE IF NOT EXISTS public.service_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(service_id, checklist_id)
);

-- Enable RLS
ALTER TABLE public.service_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_checklists ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_collaborators
CREATE POLICY "All authenticated can view service collaborators"
ON public.service_collaborators FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create service collaborators"
ON public.service_collaborators FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and moderators can update service collaborators"
ON public.service_collaborators FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Only admins can delete service collaborators"
ON public.service_collaborators FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for service_checklists
CREATE POLICY "All authenticated can view service checklists"
ON public.service_checklists FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create service checklists"
ON public.service_checklists FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and moderators can update service checklists"
ON public.service_checklists FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Only admins can delete service checklists"
ON public.service_checklists FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));