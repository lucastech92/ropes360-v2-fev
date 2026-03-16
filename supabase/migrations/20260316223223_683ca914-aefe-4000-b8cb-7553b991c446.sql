
-- Fix inventory_predictions: Remove overly permissive ALL policy, keep SELECT
DROP POLICY IF EXISTS "System can manage predictions" ON public.inventory_predictions;
CREATE POLICY "Admins and moderators can manage predictions"
ON public.inventory_predictions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Fix inventory_consumption_history: Restrict INSERT to admin/moderator (trigger uses SECURITY DEFINER)
DROP POLICY IF EXISTS "System can insert consumption history" ON public.inventory_consumption_history;
CREATE POLICY "Admins and moderators can insert consumption history"
ON public.inventory_consumption_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Fix notifications: Restrict INSERT to own user_id (trigger uses SECURITY DEFINER for system notifications)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fix report_patterns: Restrict INSERT/UPDATE to admin/moderator
DROP POLICY IF EXISTS "System can create report patterns" ON public.report_patterns;
DROP POLICY IF EXISTS "System can update report patterns" ON public.report_patterns;
CREATE POLICY "Admins and moderators can create report patterns"
ON public.report_patterns
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins and moderators can update report patterns"
ON public.report_patterns
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Fix user_profiles: Restrict INSERT to own user_id (trigger uses SECURITY DEFINER)
DROP POLICY IF EXISTS "System can create profiles" ON public.user_profiles;
CREATE POLICY "Users can create own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);
