-- Security phase 1: server-side approval and least-privilege RPC entry points.

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION public.is_approved_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND approved IS TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND approved IS TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.has_approved_role(p_allowed_roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND approved IS TRUE
      AND role = ANY(p_allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_approved_role(public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_approved_role(public.app_role[]) TO authenticated;

-- A restrictive policy is combined with every existing permissive policy. This
-- makes approval a server-side prerequisite for every business table.
DO $$
DECLARE
  v_table record;
BEGIN
  FOR v_table IN
    SELECT relname
    FROM (VALUES
      ('user_roles'),
      ('services'),
      ('service_resource_manifest_items'),
      ('service_return_sessions'),
      ('service_return_items'),
      ('service_documents'),
      ('service_document_review_feedback'),
      ('service_dispatch_items'),
      ('service_inventory_movements'),
      ('service_phase_history'),
      ('operation_containers'),
      ('technical_documents'),
      ('document_embeddings'),
      ('certifications')
    ) AS protected_tables(relname)
    WHERE to_regclass(format('public.%I', relname)) IS NOT NULL
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS approved_users_only ON public.%I', v_table.relname);
    EXECUTE format(
      'CREATE POLICY approved_users_only ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_approved_user(auth.uid())) WITH CHECK (public.is_approved_user(auth.uid()))',
      v_table.relname
    );
  END LOOP;
END;
$$;

-- Keep privileged implementations private and expose guarded entry points.
ALTER FUNCTION public.upsert_service_resource_manifest(uuid, uuid, integer, text)
  RENAME TO upsert_service_resource_manifest_internal;
ALTER FUNCTION public.dispatch_service_resource_manifest(uuid, integer)
  RENAME TO dispatch_service_resource_manifest_internal;
ALTER FUNCTION public.return_service_resource_manifest(uuid, integer, integer, text)
  RENAME TO return_service_resource_manifest_internal;
ALTER FUNCTION public.start_service_return(uuid)
  RENAME TO start_service_return_internal;
ALTER FUNCTION public.record_service_return_item(uuid, integer, text, text)
  RENAME TO record_service_return_item_internal;
ALTER FUNCTION public.complete_service_return(uuid, text)
  RENAME TO complete_service_return_internal;

REVOKE ALL ON FUNCTION public.upsert_service_resource_manifest_internal(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispatch_service_resource_manifest_internal(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.return_service_resource_manifest_internal(uuid, integer, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_service_return_internal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_service_return_item_internal(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_service_return_internal(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.upsert_service_resource_manifest(
  p_service_id uuid,
  p_inventory_item_id uuid,
  p_planned_quantity integer,
  p_notes text DEFAULT NULL
)
RETURNS public.service_resource_manifest_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_approved_role(ARRAY['admin','moderator','inspector']::public.app_role[]) THEN
    RAISE EXCEPTION 'Approved operational role required';
  END IF;
  RETURN public.upsert_service_resource_manifest_internal(
    p_service_id, p_inventory_item_id, p_planned_quantity, p_notes
  );
END;
$$;

CREATE FUNCTION public.dispatch_service_resource_manifest(
  p_manifest_id uuid,
  p_dispatched_quantity integer
)
RETURNS public.service_resource_manifest_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_approved_role(ARRAY['admin','moderator','inspector']::public.app_role[]) THEN
    RAISE EXCEPTION 'Approved operational role required';
  END IF;
  RETURN public.dispatch_service_resource_manifest_internal(p_manifest_id, p_dispatched_quantity);
END;
$$;

CREATE FUNCTION public.return_service_resource_manifest(
  p_manifest_id uuid,
  p_returned_quantity integer,
  p_consumed_quantity integer,
  p_notes text DEFAULT NULL
)
RETURNS public.service_resource_manifest_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_approved_role(ARRAY['admin','moderator','inspector']::public.app_role[]) THEN
    RAISE EXCEPTION 'Approved operational role required';
  END IF;
  RETURN public.return_service_resource_manifest_internal(
    p_manifest_id, p_returned_quantity, p_consumed_quantity, p_notes
  );
END;
$$;

CREATE FUNCTION public.start_service_return(p_service_id uuid)
RETURNS public.service_return_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_approved_role(ARRAY['admin','moderator','inspector']::public.app_role[]) THEN
    RAISE EXCEPTION 'Approved operational role required';
  END IF;
  RETURN public.start_service_return_internal(p_service_id);
END;
$$;

CREATE FUNCTION public.record_service_return_item(
  p_return_item_id uuid,
  p_returned_quantity integer,
  p_return_condition text,
  p_notes text DEFAULT NULL
)
RETURNS public.service_return_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_approved_role(ARRAY['admin','moderator','inspector']::public.app_role[]) THEN
    RAISE EXCEPTION 'Approved operational role required';
  END IF;
  RETURN public.record_service_return_item_internal(
    p_return_item_id, p_returned_quantity, p_return_condition, p_notes
  );
END;
$$;

CREATE FUNCTION public.complete_service_return(
  p_return_session_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.service_return_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_approved_role(ARRAY['admin','moderator','inspector']::public.app_role[]) THEN
    RAISE EXCEPTION 'Approved operational role required';
  END IF;
  RETURN public.complete_service_return_internal(p_return_session_id, p_notes);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_service_resource_manifest(uuid, uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatch_service_resource_manifest(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_service_resource_manifest(uuid, integer, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_service_return(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_service_return_item(uuid, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_service_return(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.upsert_service_resource_manifest(uuid, uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_service_resource_manifest(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_service_resource_manifest(uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_service_return(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_service_return_item(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_service_return(uuid, text) TO authenticated;

-- Notifications are produced by trusted triggers/edge functions, never by clients.
REVOKE ALL ON FUNCTION public.create_notification_with_push(uuid, text, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification_with_push(uuid, text, text, text, text, uuid)
  TO service_role;

-- Trigger helpers and private implementations must not remain public because
-- PostgreSQL grants function execution to PUBLIC by default.
DO $$
DECLARE
  v_function record;
BEGIN
  FOR v_function IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', v_function.signature);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.is_approved_user(uuid) IS
  'Server-side approval gate shared by restrictive RLS policies.';
COMMENT ON FUNCTION public.has_approved_role(public.app_role[]) IS
  'Checks that the current authenticated user has an approved allowed role.';