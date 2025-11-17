-- Create storage policies for technical-documents bucket
CREATE POLICY "Admins can upload technical documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'technical-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can view technical documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'technical-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update technical documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'technical-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete technical documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'technical-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);