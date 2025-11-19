-- Remove vector extension and revert to text search
DROP FUNCTION IF EXISTS search_document_content_semantic(vector, float, int);
DROP INDEX IF EXISTS document_embeddings_embedding_idx;

-- Revert embedding column back to text (we'll store null)
ALTER TABLE document_embeddings 
  ALTER COLUMN embedding TYPE text USING NULL;

-- Improve text search function with better keyword matching
CREATE OR REPLACE FUNCTION search_document_content(
  search_query text,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  search_terms text[];
  term text;
  query_tsquery tsquery;
BEGIN
  -- Extract individual words from search query
  search_terms := regexp_split_to_array(lower(search_query), E'\\s+');
  
  -- Build OR query for flexible matching
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
$$;