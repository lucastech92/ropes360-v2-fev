-- Create a function to get services with counts in a single query
CREATE OR REPLACE FUNCTION public.get_services_with_counts()
RETURNS TABLE (
  id uuid,
  codigo_jbr text,
  cliente text,
  local text,
  escopo text[],
  outros_escopo text,
  aplicacao text,
  equipamentos text,
  data_inicio date,
  data_termino date,
  created_at timestamptz,
  collaborators_count bigint,
  checklists_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.codigo_jbr,
    s.cliente,
    s.local,
    s.escopo,
    s.outros_escopo,
    s.aplicacao,
    s.equipamentos,
    s.data_inicio,
    s.data_termino,
    s.created_at,
    COALESCE((SELECT COUNT(*) FROM service_collaborators sc WHERE sc.service_id = s.id), 0) as collaborators_count,
    COALESCE((SELECT COUNT(*) FROM service_checklists sch WHERE sch.service_id = s.id), 0) as checklists_count
  FROM services s
  ORDER BY s.created_at DESC;
$$;