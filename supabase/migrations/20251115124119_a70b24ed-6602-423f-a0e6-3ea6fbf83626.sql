-- Criar bucket de storage para documentos técnicos
INSERT INTO storage.buckets (id, name, public)
VALUES ('technical-documents', 'technical-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket
CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'technical-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'technical-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'technical-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);