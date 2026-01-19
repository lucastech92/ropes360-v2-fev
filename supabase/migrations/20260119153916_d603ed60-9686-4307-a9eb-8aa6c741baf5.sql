-- Function to check for expiring calibrations and create notifications
CREATE OR REPLACE FUNCTION public.check_expiring_calibrations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item RECORD;
  v_user_id UUID;
  v_days_until INTEGER;
  v_urgency TEXT;
BEGIN
  -- Get items with calibration expiring in 7 days or less
  FOR v_item IN 
    SELECT i.id, i.item_name, i.next_calibration, i.code
    FROM public.inventory i
    WHERE i.next_calibration IS NOT NULL
      AND i.item_type = 'equipamento'
      AND i.next_calibration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_id = i.id
          AND n.type = 'calibration_expiring'
          AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
      )
  LOOP
    v_days_until := v_item.next_calibration - CURRENT_DATE;
    
    -- Determine urgency level
    IF v_days_until <= 1 THEN
      v_urgency := 'URGENTE: ';
    ELSIF v_days_until <= 3 THEN
      v_urgency := 'ATENÇÃO: ';
    ELSE
      v_urgency := '';
    END IF;
    
    -- Create notification for all approved users
    FOR v_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.approved = true
    LOOP
      PERFORM public.create_notification_with_push(
        v_user_id,
        v_urgency || 'Calibração vencendo',
        'O equipamento "' || v_item.item_name || '"' || 
        CASE WHEN v_item.code IS NOT NULL THEN ' (' || v_item.code || ')' ELSE '' END ||
        ' precisa ser calibrado em ' || v_days_until || ' dia(s)',
        'calibration_expiring',
        'inventario',
        v_item.id
      );
    END LOOP;
  END LOOP;
  
  -- Also check for overdue calibrations
  FOR v_item IN 
    SELECT i.id, i.item_name, i.next_calibration, i.code
    FROM public.inventory i
    WHERE i.next_calibration IS NOT NULL
      AND i.item_type = 'equipamento'
      AND i.next_calibration < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_id = i.id
          AND n.type = 'calibration_overdue'
          AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
      )
  LOOP
    v_days_until := CURRENT_DATE - v_item.next_calibration;
    
    FOR v_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.approved = true
    LOOP
      PERFORM public.create_notification_with_push(
        v_user_id,
        'VENCIDA: Calibração atrasada',
        'O equipamento "' || v_item.item_name || '"' || 
        CASE WHEN v_item.code IS NOT NULL THEN ' (' || v_item.code || ')' ELSE '' END ||
        ' está com calibração vencida há ' || v_days_until || ' dia(s)',
        'calibration_overdue',
        'inventario',
        v_item.id
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Function to check for upcoming maintenance
CREATE OR REPLACE FUNCTION public.check_maintenance_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id UUID;
  v_days_until INTEGER;
  v_urgency TEXT;
BEGIN
  -- Get maintenance records due in 7 days or less that haven't been notified recently
  FOR v_record IN 
    SELECT m.id, m.equipment_name, m.equipment_code, m.scheduled_date, m.maintenance_type, m.priority
    FROM public.maintenance_records m
    WHERE m.scheduled_date IS NOT NULL
      AND m.status NOT IN ('completed', 'cancelled')
      AND m.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_id = m.id
          AND n.type = 'maintenance_scheduled'
          AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
      )
  LOOP
    v_days_until := v_record.scheduled_date - CURRENT_DATE;
    
    -- Determine urgency based on days and priority
    IF v_days_until <= 1 OR v_record.priority = 'alta' THEN
      v_urgency := 'URGENTE: ';
    ELSIF v_days_until <= 3 THEN
      v_urgency := 'ATENÇÃO: ';
    ELSE
      v_urgency := '';
    END IF;
    
    -- Create notification for all approved users
    FOR v_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.approved = true
    LOOP
      PERFORM public.create_notification_with_push(
        v_user_id,
        v_urgency || 'Manutenção agendada',
        v_record.maintenance_type || ' para "' || v_record.equipment_name || '"' ||
        CASE WHEN v_record.equipment_code IS NOT NULL THEN ' (' || v_record.equipment_code || ')' ELSE '' END ||
        ' em ' || TO_CHAR(v_record.scheduled_date, 'DD/MM/YYYY'),
        'maintenance_scheduled',
        'inventario',
        v_record.id
      );
    END LOOP;
  END LOOP;
  
  -- Check for overdue maintenance
  FOR v_record IN 
    SELECT m.id, m.equipment_name, m.equipment_code, m.scheduled_date, m.maintenance_type
    FROM public.maintenance_records m
    WHERE m.scheduled_date IS NOT NULL
      AND m.status NOT IN ('completed', 'cancelled')
      AND m.scheduled_date < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_id = m.id
          AND n.type = 'maintenance_overdue'
          AND n.created_at > CURRENT_DATE - INTERVAL '3 days'
      )
  LOOP
    v_days_until := CURRENT_DATE - v_record.scheduled_date;
    
    FOR v_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.approved = true
    LOOP
      PERFORM public.create_notification_with_push(
        v_user_id,
        'ATRASADA: Manutenção pendente',
        v_record.maintenance_type || ' para "' || v_record.equipment_name || '" está atrasada há ' || v_days_until || ' dia(s)',
        'maintenance_overdue',
        'inventario',
        v_record.id
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Create trigger for immediate notification when maintenance is created/updated
CREATE OR REPLACE FUNCTION public.notify_on_maintenance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_days_until INTEGER;
BEGIN
  -- Only notify for upcoming maintenance within 3 days
  IF NEW.scheduled_date IS NOT NULL AND NEW.status NOT IN ('completed', 'cancelled') THEN
    v_days_until := NEW.scheduled_date - CURRENT_DATE;
    
    IF v_days_until >= 0 AND v_days_until <= 3 THEN
      FOR v_user_id IN
        SELECT DISTINCT ur.user_id
        FROM public.user_roles ur
        WHERE ur.approved = true
      LOOP
        -- Only create notification if one doesn't exist recently
        IF NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.related_id = NEW.id
            AND n.type = 'maintenance_scheduled'
            AND n.created_at > NOW() - INTERVAL '6 hours'
        ) THEN
          PERFORM public.create_notification_with_push(
            v_user_id,
            CASE WHEN v_days_until <= 1 THEN 'URGENTE: ' ELSE '' END || 'Manutenção agendada',
            NEW.maintenance_type || ' para "' || NEW.equipment_name || '" em ' || 
            CASE 
              WHEN v_days_until = 0 THEN 'HOJE'
              WHEN v_days_until = 1 THEN 'amanhã'
              ELSE v_days_until || ' dias'
            END,
            'maintenance_scheduled',
            'inventario',
            NEW.id
          );
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_notify_maintenance_change ON public.maintenance_records;
CREATE TRIGGER trigger_notify_maintenance_change
  AFTER INSERT OR UPDATE OF scheduled_date, status ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_maintenance_change();

-- Create trigger for inventory calibration changes
CREATE OR REPLACE FUNCTION public.notify_on_calibration_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_days_until INTEGER;
BEGIN
  -- Only for equipment items with calibration dates
  IF NEW.item_type = 'equipamento' AND NEW.next_calibration IS NOT NULL THEN
    v_days_until := NEW.next_calibration - CURRENT_DATE;
    
    -- Notify if calibration is within 3 days or overdue
    IF v_days_until <= 3 THEN
      FOR v_user_id IN
        SELECT DISTINCT ur.user_id
        FROM public.user_roles ur
        WHERE ur.approved = true
      LOOP
        -- Avoid duplicate notifications
        IF NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.related_id = NEW.id
            AND n.type IN ('calibration_expiring', 'calibration_overdue')
            AND n.created_at > NOW() - INTERVAL '6 hours'
        ) THEN
          IF v_days_until < 0 THEN
            PERFORM public.create_notification_with_push(
              v_user_id,
              'VENCIDA: Calibração atrasada',
              'O equipamento "' || NEW.item_name || '" está com calibração vencida',
              'calibration_overdue',
              'inventario',
              NEW.id
            );
          ELSE
            PERFORM public.create_notification_with_push(
              v_user_id,
              CASE WHEN v_days_until <= 1 THEN 'URGENTE: ' ELSE '' END || 'Calibração vencendo',
              'O equipamento "' || NEW.item_name || '" precisa ser calibrado em ' ||
              CASE 
                WHEN v_days_until = 0 THEN 'HOJE'
                WHEN v_days_until = 1 THEN '1 dia'
                ELSE v_days_until || ' dias'
              END,
              'calibration_expiring',
              'inventario',
              NEW.id
            );
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_notify_calibration_change ON public.inventory;
CREATE TRIGGER trigger_notify_calibration_change
  AFTER INSERT OR UPDATE OF next_calibration ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_calibration_change();