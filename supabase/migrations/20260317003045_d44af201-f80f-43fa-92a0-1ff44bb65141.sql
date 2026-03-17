
CREATE OR REPLACE FUNCTION public.calculate_health_score()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_cert_total int;
  v_cert_valid int;
  v_cert_score numeric;
  v_calib_total int;
  v_calib_valid int;
  v_calib_score numeric;
  v_maint_total int;
  v_maint_ontime int;
  v_maint_score numeric;
  v_inv_total int;
  v_inv_ok int;
  v_inv_score numeric;
  v_overall numeric;
BEGIN
  -- Certifications: % valid (not expired)
  SELECT COUNT(*), COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE)
  INTO v_cert_total, v_cert_valid
  FROM certifications;
  v_cert_score := CASE WHEN v_cert_total > 0 THEN (v_cert_valid::numeric / v_cert_total) * 100 ELSE 100 END;

  -- Calibrations: % equipment with calibration up to date
  SELECT COUNT(*), COUNT(*) FILTER (WHERE next_calibration IS NULL OR next_calibration >= CURRENT_DATE)
  INTO v_calib_total, v_calib_valid
  FROM inventory WHERE item_type = 'equipamento';
  v_calib_score := CASE WHEN v_calib_total > 0 THEN (v_calib_valid::numeric / v_calib_total) * 100 ELSE 100 END;

  -- Maintenance: % not overdue
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('concluído', 'completed') OR scheduled_date >= CURRENT_DATE)
  INTO v_maint_total, v_maint_ontime
  FROM maintenance_records WHERE status NOT IN ('cancelled');
  v_maint_score := CASE WHEN v_maint_total > 0 THEN (v_maint_ontime::numeric / v_maint_total) * 100 ELSE 100 END;

  -- Inventory: % items above minimum quantity
  SELECT COUNT(*), COUNT(*) FILTER (WHERE min_quantity IS NULL OR quantity >= min_quantity)
  INTO v_inv_total, v_inv_ok
  FROM inventory WHERE item_type = 'consumivel';
  v_inv_score := CASE WHEN v_inv_total > 0 THEN (v_inv_ok::numeric / v_inv_total) * 100 ELSE 100 END;

  -- Weighted average (certs 30%, calibrations 30%, maintenance 25%, inventory 15%)
  v_overall := (v_cert_score * 0.30) + (v_calib_score * 0.30) + (v_maint_score * 0.25) + (v_inv_score * 0.15);

  RETURN jsonb_build_object(
    'overall', ROUND(v_overall),
    'certifications', jsonb_build_object('score', ROUND(v_cert_score), 'total', v_cert_total, 'valid', v_cert_valid),
    'calibrations', jsonb_build_object('score', ROUND(v_calib_score), 'total', v_calib_total, 'valid', v_calib_valid),
    'maintenance', jsonb_build_object('score', ROUND(v_maint_score), 'total', v_maint_total, 'ontime', v_maint_ontime),
    'inventory', jsonb_build_object('score', ROUND(v_inv_score), 'total', v_inv_total, 'ok', v_inv_ok)
  );
END;
$fn$;
