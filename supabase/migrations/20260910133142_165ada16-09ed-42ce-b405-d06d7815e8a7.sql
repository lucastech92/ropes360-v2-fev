CREATE TABLE public.meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  summary text,
  participants uuid[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_minutes TO authenticated;
GRANT ALL ON public.meeting_minutes TO service_role;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view minutes" ON public.meeting_minutes FOR SELECT TO authenticated USING (public.is_approved_user());
CREATE POLICY "Approved users can create minutes" ON public.meeting_minutes FOR INSERT TO authenticated WITH CHECK (public.is_approved_user() AND created_by = auth.uid());
CREATE POLICY "Approved users can update minutes" ON public.meeting_minutes FOR UPDATE TO authenticated USING (public.is_approved_user()) WITH CHECK (public.is_approved_user());
CREATE POLICY "Admins can delete minutes" ON public.meeting_minutes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.meeting_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minute_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  title text NOT NULL,
  objective text,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meeting_projects_status_check CHECK (status IN ('in_progress','delayed','completed','planned'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_projects TO authenticated;
GRANT ALL ON public.meeting_projects TO service_role;
ALTER TABLE public.meeting_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view meeting projects" ON public.meeting_projects FOR SELECT TO authenticated USING (public.is_approved_user());
CREATE POLICY "Approved users can create meeting projects" ON public.meeting_projects FOR INSERT TO authenticated WITH CHECK (public.is_approved_user());
CREATE POLICY "Approved users can update meeting projects" ON public.meeting_projects FOR UPDATE TO authenticated USING (public.is_approved_user()) WITH CHECK (public.is_approved_user());
CREATE POLICY "Admins can delete meeting projects" ON public.meeting_projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minute_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.meeting_projects(id) ON DELETE SET NULL,
  description text NOT NULL,
  assignee_id uuid,
  assignee_name text,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meeting_action_items_status_check CHECK (status IN ('pending','in_progress','completed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_action_items TO authenticated;
GRANT ALL ON public.meeting_action_items TO service_role;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view action items" ON public.meeting_action_items FOR SELECT TO authenticated USING (public.is_approved_user());
CREATE POLICY "Approved users can create action items" ON public.meeting_action_items FOR INSERT TO authenticated WITH CHECK (public.is_approved_user());
CREATE POLICY "Approved users can update action items" ON public.meeting_action_items FOR UPDATE TO authenticated USING (public.is_approved_user()) WITH CHECK (public.is_approved_user());
CREATE POLICY "Admins can delete action items" ON public.meeting_action_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_meeting_projects_minute ON public.meeting_projects(minute_id);
CREATE INDEX idx_meeting_action_items_minute ON public.meeting_action_items(minute_id);
CREATE INDEX idx_meeting_action_items_assignee ON public.meeting_action_items(assignee_id);

CREATE TRIGGER trg_meeting_minutes_updated_at BEFORE UPDATE ON public.meeting_minutes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meeting_projects_updated_at BEFORE UPDATE ON public.meeting_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meeting_action_items_updated_at BEFORE UPDATE ON public.meeting_action_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();