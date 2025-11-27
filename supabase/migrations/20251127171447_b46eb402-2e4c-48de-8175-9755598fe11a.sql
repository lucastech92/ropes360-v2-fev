-- Create push_subscriptions table to store user push notification tokens
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create notification and send push
CREATE OR REPLACE FUNCTION public.create_notification_with_push(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_related_module TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Insert notification
  INSERT INTO public.notifications (user_id, title, message, type, related_module, related_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_related_module, p_related_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger function to check expiring documents
CREATE OR REPLACE FUNCTION public.check_expiring_documents()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_user_id UUID;
BEGIN
  -- Get documents expiring in 7 days or less
  FOR v_doc IN 
    SELECT d.id, d.title, d.expiry_date, d.user_id
    FROM public.documents d
    WHERE d.expiry_date IS NOT NULL
      AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_id = d.id
          AND n.type = 'document_expiring'
          AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
      )
  LOOP
    -- Create notification for all users
    FOR v_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.approved = true
    LOOP
      PERFORM public.create_notification_with_push(
        v_user_id,
        'Documento expirando em breve',
        'O documento "' || v_doc.title || '" expira em ' || (v_doc.expiry_date - CURRENT_DATE) || ' dias',
        'document_expiring',
        'documents',
        v_doc.id
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Trigger function for low inventory
CREATE OR REPLACE FUNCTION public.notify_low_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if inventory is below minimum
  IF NEW.min_quantity IS NOT NULL AND NEW.quantity <= NEW.min_quantity THEN
    -- Notify all users
    FOR v_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.approved = true
    LOOP
      PERFORM public.create_notification_with_push(
        v_user_id,
        'Estoque baixo',
        'O item "' || NEW.item_name || '" está com estoque baixo: ' || NEW.quantity || ' ' || COALESCE(NEW.unit, 'unidades'),
        'inventory_low',
        'inventory',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for inventory updates
DROP TRIGGER IF EXISTS trigger_notify_low_inventory ON public.inventory;
CREATE TRIGGER trigger_notify_low_inventory
  AFTER INSERT OR UPDATE OF quantity
  ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_low_inventory();

-- Trigger function for maintenance schedules
CREATE OR REPLACE FUNCTION public.notify_maintenance_scheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_days_until INTEGER;
BEGIN
  v_days_until := NEW.scheduled_date - CURRENT_DATE;
  
  -- Notify if maintenance is within 3 days
  IF v_days_until <= 3 AND v_days_until >= 0 AND NEW.status != 'completed' THEN
    FOR v_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.approved = true
    LOOP
      PERFORM public.create_notification_with_push(
        v_user_id,
        'Manutenção agendada em breve',
        'Manutenção "' || NEW.equipment_name || '" agendada para ' || TO_CHAR(NEW.scheduled_date, 'DD/MM/YYYY'),
        'maintenance_scheduled',
        'maintenance',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for maintenance records
DROP TRIGGER IF EXISTS trigger_notify_maintenance_scheduled ON public.maintenance_records;
CREATE TRIGGER trigger_notify_maintenance_scheduled
  AFTER INSERT OR UPDATE OF scheduled_date, status
  ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_maintenance_scheduled();

-- Trigger function for user approvals
CREATE OR REPLACE FUNCTION public.notify_pending_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_user_email TEXT;
BEGIN
  -- Only notify on new users awaiting approval
  IF NEW.approved = false AND OLD.approved IS NULL THEN
    -- Get user email
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = NEW.user_id;
    
    -- Notify all admins
    FOR v_admin_id IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role = 'admin' AND ur.approved = true
    LOOP
      PERFORM public.create_notification_with_push(
        v_admin_id,
        'Novo usuário aguardando aprovação',
        'Usuário "' || COALESCE(v_user_email, 'desconhecido') || '" aguarda aprovação',
        'user_approval',
        'users',
        NEW.user_id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for user approvals
DROP TRIGGER IF EXISTS trigger_notify_pending_approval ON public.user_roles;
CREATE TRIGGER trigger_notify_pending_approval
  AFTER INSERT OR UPDATE OF approved
  ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pending_approval();