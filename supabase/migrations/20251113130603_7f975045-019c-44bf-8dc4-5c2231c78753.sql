-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create new update policy that allows users to update own profile OR admins/moderators to update any profile
CREATE POLICY "Users update own profile or admins moderators update any"
ON public.user_profiles
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
);