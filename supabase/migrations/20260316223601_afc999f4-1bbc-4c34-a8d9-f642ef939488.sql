
-- Fix search_document_content: add immutable search_path
CREATE OR REPLACE FUNCTION public.search_document_content(search_query text, match_count integer DEFAULT 10)
 RETURNS TABLE(id uuid, document_id uuid, content text, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  search_terms text[];
  term text;
  query_tsquery tsquery;
BEGIN
  search_terms := regexp_split_to_array(lower(search_query), E'\\s+');
  query_tsquery := to_tsquery('simple', array_to_string(search_terms, ' | '));
  
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.content,
    de.metadata
  FROM document_embeddings de
  WHERE to_tsvector('simple', lower(de.content)) @@ query_tsquery
  ORDER BY ts_rank(to_tsvector('simple', lower(de.content)), query_tsquery) DESC
  LIMIT match_count;
END;
$function$;
