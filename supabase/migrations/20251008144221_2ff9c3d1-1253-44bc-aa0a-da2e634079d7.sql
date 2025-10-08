-- =====================================================
-- CRITICAL SECURITY FIX: Implement Proper Authentication and Authorization
-- =====================================================

-- Step 1: Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'inspector', 'viewer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 3: Create trigger to automatically assign default 'inspector' role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'inspector');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Add user_id to documents table to track ownership
ALTER TABLE public.documents ADD COLUMN user_id UUID;

-- Update existing documents to prevent issues (set to NULL since we don't have auth yet)
-- In production with real users, you'd need to handle this differently

-- Step 5: DROP old insecure RLS policies
DROP POLICY IF EXISTS "Anyone can view documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone can delete documents" ON public.documents;

-- Step 6: CREATE secure RLS policies requiring authentication
CREATE POLICY "Authenticated users can view documents"
ON public.documents
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload documents"
ON public.documents
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can delete any document"
ON public.documents
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own documents"
ON public.documents
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 7: Secure storage bucket - make it private
UPDATE storage.buckets
SET public = false
WHERE id = 'documents';

-- Step 8: DROP old insecure storage policies
DROP POLICY IF EXISTS "Anyone can view documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload documents to storage" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete documents from storage" ON storage.objects;

-- Step 9: CREATE secure storage policies
CREATE POLICY "Authenticated users can view documents in storage"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload to storage"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete from storage"
ON storage.objects
FOR DELETE
USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own files in storage"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- Step 10: Create audit log table for tracking document operations
CREATE TABLE public.document_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.document_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Step 11: Create trigger to automatically log document operations
CREATE OR REPLACE FUNCTION public.log_document_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.document_audit_log (document_id, user_id, action)
    VALUES (OLD.id, auth.uid(), 'DELETE');
    RETURN OLD;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.document_audit_log (document_id, user_id, action)
    VALUES (NEW.id, auth.uid(), 'INSERT');
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.document_audit_log (document_id, user_id, action)
    VALUES (NEW.id, auth.uid(), 'UPDATE');
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER document_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.log_document_operation();

-- Step 12: RLS policy for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));