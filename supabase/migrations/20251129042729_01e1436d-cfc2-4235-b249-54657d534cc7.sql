-- Fix user_profiles UPDATE policy to prevent privilege escalation
-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users update own profile or admins moderators update any" ON public.user_profiles;

-- Policy 1: Users can update only their own profile
CREATE POLICY "Users update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Admins can update any profile
CREATE POLICY "Admins update any profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy 3: Moderators can update non-admin profiles only
CREATE POLICY "Moderators update non-admin profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'moderator'::app_role) AND
  NOT public.has_role(user_id, 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'moderator'::app_role) AND
  NOT public.has_role(user_id, 'admin'::app_role)
);

-- Create trigger function to prevent users from editing company/position fields
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is updating their own profile (not admin/moderator)
  IF auth.uid() = NEW.user_id AND 
     NOT public.has_role(auth.uid(), 'admin'::app_role) AND
     NOT public.has_role(auth.uid(), 'moderator'::app_role) THEN
    
    -- Prevent changes to company, position, and email
    IF OLD.company IS DISTINCT FROM NEW.company OR
       OLD.position IS DISTINCT FROM NEW.position OR
       OLD.email IS DISTINCT FROM NEW.email THEN
      RAISE EXCEPTION 'Users cannot modify company, position, or email fields';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate profile updates
DROP TRIGGER IF EXISTS validate_profile_update_trigger ON public.user_profiles;
CREATE TRIGGER validate_profile_update_trigger
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_update();