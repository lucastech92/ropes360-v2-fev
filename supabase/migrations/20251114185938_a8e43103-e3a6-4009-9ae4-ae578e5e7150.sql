-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create function for text similarity search (fallback without embeddings)
CREATE OR REPLACE FUNCTION search_document_content(
  search_query text,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.document_id,
    document_embeddings.content,
    document_embeddings.metadata
  FROM document_embeddings
  WHERE document_embeddings.content ILIKE '%' || search_query || '%'
  ORDER BY chunk_index
  LIMIT match_count;
END;
$$;