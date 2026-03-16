
-- Create certifications table
CREATE TABLE public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  certification_name TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- SELECT: own certs or admin/moderator see all
CREATE POLICY "Users view own certs, admins view all"
ON public.certifications FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- INSERT: any authenticated with created_by = self
CREATE POLICY "Authenticated users can insert certifications"
ON public.certifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- UPDATE: admin/moderator only
CREATE POLICY "Admins and moderators can update certifications"
ON public.certifications FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- DELETE: admin only
CREATE POLICY "Only admins can delete certifications"
ON public.certifications FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create competency_matrix table
CREATE TABLE public.competency_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  skill_level TEXT NOT NULL DEFAULT 'beginner',
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_name)
);

-- Enable RLS
ALTER TABLE public.competency_matrix ENABLE ROW LEVEL SECURITY;

-- SELECT: own or admin/moderator
CREATE POLICY "Users view own competencies, admins view all"
ON public.competency_matrix FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- INSERT: admin/moderator
CREATE POLICY "Admins and moderators can insert competencies"
ON public.competency_matrix FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- UPDATE: admin/moderator
CREATE POLICY "Admins and moderators can update competencies"
ON public.competency_matrix FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- DELETE: admin only
CREATE POLICY "Only admins can delete competencies"
ON public.competency_matrix FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Function to check expiring certifications and create notifications
CREATE OR REPLACE FUNCTION public.check_expiring_certifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cert RECORD;
  v_user_id UUID;
  v_days_until INTEGER;
  v_urgency TEXT;
BEGIN
  FOR v_cert IN
    SELECT c.id, c.certification_name, c.expiry_date, c.user_id
    FROM public.certifications c
    WHERE c.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_id = c.id
          AND n.type = 'certification_expiring'
          AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
      )
  LOOP
    v_days_until := v_cert.expiry_date - CURRENT_DATE;
    
    IF v_days_until <= 7 THEN
      v_urgency := 'URGENTE: ';
    ELSIF v_days_until <= 15 THEN
      v_urgency := 'ATENÇÃO: ';
    ELSE
      v_urgency := '';
    END IF;

    -- Notify the cert owner
    PERFORM public.create_notification_with_push(
      v_cert.user_id,
      v_urgency || 'Certificado vencendo',
      'O certificado "' || v_cert.certification_name || '" vence em ' || v_days_until || ' dia(s)',
      'certification_expiring',
      'certificacoes',
      v_cert.id
    );

    -- Also notify admins
    FOR v_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role = 'admin' AND ur.approved = true AND ur.user_id != v_cert.user_id
    LOOP
      PERFORM public.create_notification_with_push(
        v_user_id,
        v_urgency || 'Certificado de técnico vencendo',
        'O certificado "' || v_cert.certification_name || '" vence em ' || v_days_until || ' dia(s)',
        'certification_expiring',
        'certificacoes',
        v_cert.id
      );
    END LOOP;
  END LOOP;
END;
$$;
