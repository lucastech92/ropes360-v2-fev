
CREATE OR REPLACE FUNCTION public.get_service_timeline(p_service_id uuid)
RETURNS TABLE(
  event_type text,
  event_date timestamptz,
  title text,
  description text,
  icon_type text,
  actor_name text,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  RETURN QUERY
  SELECT
    'service_created'::text,
    s.created_at,
    'Serviço criado'::text,
    ('Código JBR: ' || s.codigo_jbr || ' | Cliente: ' || s.cliente)::text,
    'calendar'::text,
    COALESCE(up.full_name, 'Sistema')::text,
    jsonb_build_object('codigo_jbr', s.codigo_jbr, 'cliente', s.cliente, 'local', s.local)
  FROM services s
  LEFT JOIN user_profiles up ON up.user_id = s.created_by
  WHERE s.id = p_service_id

  UNION ALL

  SELECT 'collaborator_added'::text, sc.created_at, 'Técnico alocado'::text,
    (COALESCE(upc.full_name, 'Usuário') || ' adicionado como ' || COALESCE(sc.role, 'inspector'))::text,
    'users'::text, COALESCE(upc.full_name, 'Usuário')::text,
    jsonb_build_object('role', sc.role, 'user_id', sc.user_id)
  FROM service_collaborators sc
  LEFT JOIN user_profiles upc ON upc.user_id = sc.user_id
  WHERE sc.service_id = p_service_id

  UNION ALL

  SELECT 'checklist_linked'::text, sch.created_at, 'Checklist vinculado'::text,
    (COALESCE(c.name, 'Checklist') || CASE WHEN c.checklist_type IS NOT NULL THEN ' (' || c.checklist_type || ')' ELSE '' END)::text,
    'clipboard'::text, 'Sistema'::text,
    jsonb_build_object('checklist_id', sch.checklist_id, 'checklist_name', c.name)
  FROM service_checklists sch
  LEFT JOIN checklists c ON c.id = sch.checklist_id
  WHERE sch.service_id = p_service_id

  UNION ALL

  SELECT 'equipment_checkout'::text, ea.checkout_date, 'Equipamento retirado'::text,
    (COALESCE(e.name, 'Equip.') || CASE WHEN e.code IS NOT NULL THEN ' (' || e.code || ')' ELSE '' END || ' → ' || COALESCE(ea.destination, 'campo'))::text,
    'wrench'::text, COALESCE(upo.full_name, 'Usuário')::text,
    jsonb_build_object('equipment_id', ea.equipment_id, 'condition', ea.condition_on_checkout, 'destination', ea.destination)
  FROM equipment_allocations ea
  LEFT JOIN equipment e ON e.id = ea.equipment_id
  LEFT JOIN user_profiles upo ON upo.user_id = ea.checked_out_by
  WHERE ea.service_id = p_service_id

  UNION ALL

  SELECT 'equipment_checkin'::text, ea2.checkin_date, 'Equipamento devolvido'::text,
    (COALESCE(e2.name, 'Equip.') || CASE WHEN e2.code IS NOT NULL THEN ' (' || e2.code || ')' ELSE '' END)::text,
    'wrench'::text, COALESCE(upi.full_name, 'Usuário')::text,
    jsonb_build_object('equipment_id', ea2.equipment_id, 'condition', ea2.condition_on_checkin)
  FROM equipment_allocations ea2
  LEFT JOIN equipment e2 ON e2.id = ea2.equipment_id
  LEFT JOIN user_profiles upi ON upi.user_id = ea2.checked_in_by
  WHERE ea2.service_id = p_service_id AND ea2.checkin_date IS NOT NULL

  UNION ALL

  SELECT 'inventory_checkout'::text, ia.checkout_date, 'Item retirado'::text,
    (COALESCE(inv.item_name, 'Item') || ' → ' || COALESCE(ia.destination, 'campo'))::text,
    'package'::text, COALESCE(upio.full_name, 'Usuário')::text,
    jsonb_build_object('inventory_item_id', ia.inventory_item_id, 'condition', ia.condition_on_checkout)
  FROM inventory_allocations ia
  LEFT JOIN inventory inv ON inv.id = ia.inventory_item_id
  LEFT JOIN user_profiles upio ON upio.user_id = ia.checked_out_by
  WHERE ia.service_id = p_service_id

  UNION ALL

  SELECT 'inventory_checkin'::text, ia2.checkin_date, 'Item devolvido'::text,
    (COALESCE(inv2.item_name, 'Item'))::text,
    'package'::text, COALESCE(upii.full_name, 'Usuário')::text,
    jsonb_build_object('inventory_item_id', ia2.inventory_item_id, 'condition', ia2.condition_on_checkin)
  FROM inventory_allocations ia2
  LEFT JOIN inventory inv2 ON inv2.id = ia2.inventory_item_id
  LEFT JOIN user_profiles upii ON upii.user_id = ia2.checked_in_by
  WHERE ia2.service_id = p_service_id AND ia2.checkin_date IS NOT NULL

  UNION ALL

  SELECT 'activity'::text, al.created_at, al.action::text, al.description::text,
    'activity'::text, COALESCE(upa.full_name, 'Sistema')::text, al.metadata::jsonb
  FROM activity_log al
  LEFT JOIN user_profiles upa ON upa.user_id = al.user_id
  WHERE al.entity_id = CAST(p_service_id AS text) AND al.entity_type = 'service'

  ORDER BY event_date DESC;
END;
$fn$;
