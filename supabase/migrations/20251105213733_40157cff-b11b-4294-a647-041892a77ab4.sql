-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'info', 'warning', 'alert', 'success'
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_module TEXT, -- 'maintenance', 'inspection', 'documents', etc.
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create activity log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'completed'
  module TEXT NOT NULL, -- 'maintenance', 'inspection', 'documents', etc.
  entity_type TEXT NOT NULL, -- 'maintenance_record', 'document', 'inspection', etc.
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own activity"
ON public.activity_log
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity"
ON public.activity_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_module ON public.activity_log(module);