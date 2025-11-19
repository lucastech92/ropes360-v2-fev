
-- Fix: Reprocessar todos os documentos com status 'ready' para 'pending'
-- para forçar novo processamento com extração correta de texto

UPDATE technical_documents 
SET status = 'pending', processed_at = NULL, error_message = NULL
WHERE status IN ('ready', 'processing');

-- Limpar todos os embeddings corrompidos
DELETE FROM document_embeddings;
