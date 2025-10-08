-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

-- Create enum for document categories
CREATE TYPE public.document_category AS ENUM (
  'procedimentos_oficiais',
  'inspecoes',
  'procedimentos_tecnicos',
  'treinamento',
  'modelos_relatorios',
  'resolucao_problemas',
  'duvidas_frequentes',
  'historico'
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category document_category NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read documents
CREATE POLICY "Anyone can view documents"
  ON public.documents
  FOR SELECT
  USING (true);

-- Allow anyone to upload documents (can be restricted later)
CREATE POLICY "Anyone can upload documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to delete documents (can be restricted later)
CREATE POLICY "Anyone can delete documents"
  ON public.documents
  FOR DELETE
  USING (true);

-- Storage policies for public access
CREATE POLICY "Anyone can view documents in storage"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "Anyone can upload documents to storage"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can delete documents from storage"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'documents');