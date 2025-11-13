-- Fix RLS Policies - Implement proper role-based permissions

-- ============================================
-- FOLDERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view folders" ON public.folders;
DROP POLICY IF EXISTS "Authenticated users can create folders" ON public.folders;
DROP POLICY IF EXISTS "Authenticated users can update folders" ON public.folders;
DROP POLICY IF EXISTS "Authenticated users can delete folders" ON public.folders;

-- All authenticated users can view folders
CREATE POLICY "All authenticated can view folders"
ON public.folders FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only admins and moderators can create folders
CREATE POLICY "Admins and moderators can create folders"
ON public.folders FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Only admins and moderators can update folders
CREATE POLICY "Admins and moderators can update folders"
ON public.folders FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Only admins can delete folders
CREATE POLICY "Only admins can delete folders"
ON public.folders FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete any document" ON public.documents;

-- All authenticated users can view documents
CREATE POLICY "All authenticated can view documents"
ON public.documents FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- All authenticated users can upload documents
CREATE POLICY "All authenticated can upload documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- All authenticated users can update their own documents
CREATE POLICY "Users can update own documents"
ON public.documents FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only admins can delete documents
CREATE POLICY "Only admins can delete documents"
ON public.documents FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- USER_ROLES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;

-- Users can view their own roles, admins and moderators can view all
CREATE POLICY "Users view own roles, admins view all"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Only admins can approve users (update approved field)
CREATE POLICY "Only admins can approve users"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can create user roles
CREATE POLICY "Only admins can insert user roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete user roles
CREATE POLICY "Only admins can delete user roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- CHECKLISTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view checklists" ON public.checklists;
DROP POLICY IF EXISTS "Authenticated users can manage checklists" ON public.checklists;

-- All authenticated users can view checklists
CREATE POLICY "All authenticated can view checklists"
ON public.checklists FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- All authenticated users can create checklists
CREATE POLICY "All authenticated can create checklists"
ON public.checklists FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update checklists
CREATE POLICY "All authenticated can update checklists"
ON public.checklists FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only admins can delete checklists
CREATE POLICY "Only admins can delete checklists"
ON public.checklists FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- CHECKLIST_ITEMS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Authenticated users can manage checklist items" ON public.checklist_items;

-- All authenticated users can view checklist items
CREATE POLICY "All authenticated can view checklist items"
ON public.checklist_items FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- All authenticated users can create checklist items
CREATE POLICY "All authenticated can create checklist items"
ON public.checklist_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update checklist items
CREATE POLICY "All authenticated can update checklist items"
ON public.checklist_items FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only admins can delete checklist items
CREATE POLICY "Only admins can delete checklist items"
ON public.checklist_items FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- INVENTORY TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON public.inventory;

-- All authenticated users can view inventory
CREATE POLICY "All authenticated can view inventory"
ON public.inventory FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- All authenticated users can create inventory items
CREATE POLICY "All authenticated can create inventory"
ON public.inventory FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update inventory items
CREATE POLICY "All authenticated can update inventory"
ON public.inventory FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only admins can delete inventory items
CREATE POLICY "Only admins can delete inventory"
ON public.inventory FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- MAINTENANCE_RECORDS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view maintenance records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Authenticated users can create maintenance records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Authenticated users can update maintenance records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Authenticated users can delete maintenance records" ON public.maintenance_records;

-- All authenticated users can view maintenance records
CREATE POLICY "All authenticated can view maintenance"
ON public.maintenance_records FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- All authenticated users can create maintenance records
CREATE POLICY "All authenticated can create maintenance"
ON public.maintenance_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- All authenticated users can update maintenance records
CREATE POLICY "All authenticated can update maintenance"
ON public.maintenance_records FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Only admins can delete maintenance records
CREATE POLICY "Only admins can delete maintenance"
ON public.maintenance_records FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- EMPLOYEE_FOLDERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Anyone authenticated can view employee folders" ON public.employee_folders;
DROP POLICY IF EXISTS "Authenticated users can create employee folders" ON public.employee_folders;
DROP POLICY IF EXISTS "Authenticated users can delete employee folders" ON public.employee_folders;

-- All authenticated users can view employee folders
CREATE POLICY "All authenticated can view employee folders"
ON public.employee_folders FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- All authenticated users can create employee folders
CREATE POLICY "All authenticated can create employee folders"
ON public.employee_folders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can delete employee folders
CREATE POLICY "Only admins can delete employee folders"
ON public.employee_folders FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- TAGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Everyone can view tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;

-- All authenticated users can view tags
CREATE POLICY "All authenticated can view tags"
ON public.tags FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- All authenticated users can create tags
CREATE POLICY "All authenticated can create tags"
ON public.tags FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can delete tags
CREATE POLICY "Only admins can delete tags"
ON public.tags FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- DOCUMENT_TAGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view document tags" ON public.document_tags;
DROP POLICY IF EXISTS "Authenticated users can manage document tags" ON public.document_tags;

-- All authenticated users can view document tags
CREATE POLICY "All authenticated can view document tags"
ON public.document_tags FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- All authenticated users can create document tags
CREATE POLICY "All authenticated can create document tags"
ON public.document_tags FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can delete document tags
CREATE POLICY "Only admins can delete document tags"
ON public.document_tags FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));