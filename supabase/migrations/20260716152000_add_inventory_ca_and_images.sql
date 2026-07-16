-- Inventory identification and image storage.

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS ca_number text;

CREATE INDEX IF NOT EXISTS idx_inventory_ca_number
  ON public.inventory (ca_number)
  WHERE ca_number IS NOT NULL;

COMMENT ON COLUMN public.inventory.ca_number IS
  'Número do Certificado de Aprovação (CA), quando aplicável ao equipamento ou EPI.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory-images',
  'inventory-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can view inventory images" ON storage.objects;
CREATE POLICY "Authenticated users can view inventory images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "Inventory managers can upload inventory images" ON storage.objects;
CREATE POLICY "Inventory managers can upload inventory images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inventory-images'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
  );

DROP POLICY IF EXISTS "Inventory managers can update inventory images" ON storage.objects;
CREATE POLICY "Inventory managers can update inventory images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'inventory-images'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
  )
  WITH CHECK (
    bucket_id = 'inventory-images'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
  );

DROP POLICY IF EXISTS "Inventory managers can delete inventory images" ON storage.objects;
CREATE POLICY "Inventory managers can delete inventory images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'inventory-images'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
  );
