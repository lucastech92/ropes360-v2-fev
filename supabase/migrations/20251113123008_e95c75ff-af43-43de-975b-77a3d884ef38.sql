-- Fix RLS Policies - Implement proper role-based permissions
-- First drop all existing policies completely

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================
-- FOLDERS TABLE
-- ============================================
CREATE POLICY "All authenticated can view folders"
ON public.folders FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and moderators can create folders"
ON public.folders FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Admins and moderators can update folders"
ON public.folders FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Only admins can delete folders"
ON public.folders FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE POLICY "All authenticated can view documents"
ON public.documents FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can upload documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
ON public.documents FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can delete documents"
ON public.documents FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- USER_ROLES TABLE
-- ============================================
CREATE POLICY "Users view own roles, admins moderators view all"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Only admins can approve users"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert user roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete user roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- USER_PROFILES TABLE
-- ============================================
CREATE POLICY "Users view own profile, admins moderators view all"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "System can create profiles"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- CHECKLISTS TABLE
-- ============================================
CREATE POLICY "All authenticated can view checklists"
ON public.checklists FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create checklists"
ON public.checklists FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can update checklists"
ON public.checklists FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete checklists"
ON public.checklists FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- CHECKLIST_ITEMS TABLE
-- ============================================
CREATE POLICY "All authenticated can view checklist items"
ON public.checklist_items FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create checklist items"
ON public.checklist_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can update checklist items"
ON public.checklist_items FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete checklist items"
ON public.checklist_items FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- INVENTORY TABLE
-- ============================================
CREATE POLICY "All authenticated can view inventory"
ON public.inventory FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create inventory"
ON public.inventory FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can update inventory"
ON public.inventory FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete inventory"
ON public.inventory FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- MAINTENANCE_RECORDS TABLE
-- ============================================
CREATE POLICY "All authenticated can view maintenance"
ON public.maintenance_records FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create maintenance"
ON public.maintenance_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "All authenticated can update maintenance"
ON public.maintenance_records FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete maintenance"
ON public.maintenance_records FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- EMPLOYEE_FOLDERS TABLE
-- ============================================
CREATE POLICY "All authenticated can view employee folders"
ON public.employee_folders FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create employee folders"
ON public.employee_folders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete employee folders"
ON public.employee_folders FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TAGS TABLE
-- ============================================
CREATE POLICY "All authenticated can view tags"
ON public.tags FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create tags"
ON public.tags FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete tags"
ON public.tags FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- DOCUMENT_TAGS TABLE
-- ============================================
CREATE POLICY "All authenticated can view document tags"
ON public.document_tags FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated can create document tags"
ON public.document_tags FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete document tags"
ON public.document_tags FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- DOCUMENT_AUDIT_LOG TABLE
-- ============================================
CREATE POLICY "Admins and moderators view audit logs"
ON public.document_audit_log FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'moderator'::app_role)
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- ACTIVITY_LOG TABLE
-- ============================================
CREATE POLICY "Users view own activity"
ON public.activity_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create own activity"
ON public.activity_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);