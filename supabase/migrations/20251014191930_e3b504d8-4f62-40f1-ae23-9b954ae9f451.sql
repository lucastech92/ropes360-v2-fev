-- Create folders table with hierarchical support
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  category text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Folders policies
CREATE POLICY "Authenticated users can view folders"
  ON public.folders FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create folders"
  ON public.folders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update folders"
  ON public.folders FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete folders"
  ON public.folders FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view tags"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create document_tags junction table
CREATE TABLE public.document_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(document_id, tag_id)
);

-- Enable RLS on document_tags
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view document tags"
  ON public.document_tags FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage document tags"
  ON public.document_tags FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Add folder_id to documents table
ALTER TABLE public.documents ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE;

-- Create checklists table
CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  service_tag text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on checklists
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklists"
  ON public.checklists FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage checklists"
  ON public.checklists FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Create checklist_items table
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid REFERENCES public.checklists(id) ON DELETE CASCADE NOT NULL,
  item_text text NOT NULL,
  is_checked boolean DEFAULT false,
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on checklist_items
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklist items"
  ON public.checklist_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage checklist items"
  ON public.checklist_items FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Create inventory table
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  category text,
  quantity integer DEFAULT 0,
  unit text,
  location text,
  min_quantity integer,
  notes text,
  last_updated timestamp with time zone DEFAULT now(),
  updated_by uuid
);

-- Enable RLS on inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inventory"
  ON public.inventory FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage inventory"
  ON public.inventory FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Insert initial folders for Procedimentos Oficiais
INSERT INTO public.folders (name, category) VALUES
  ('Procedimentos Serviços', 'procedimentos_oficiais'),
  ('Análise Preliminar de Risco (APR)', 'procedimentos_oficiais'),
  ('Normas', 'procedimentos_oficiais');

-- Insert initial folders for Home
INSERT INTO public.folders (name, category) VALUES
  ('Manuais Bridon', 'home');

-- Create example checklist for JBR
INSERT INTO public.checklists (name, description, service_tag) VALUES
  ('Montagem de Container - JBR', 'Checklist para montagem de container e ferramentas manuais', 'JBR');

-- Get the checklist id and insert items
WITH new_checklist AS (
  SELECT id FROM public.checklists WHERE service_tag = 'JBR' LIMIT 1
)
INSERT INTO public.checklist_items (checklist_id, item_text, order_index)
SELECT id, item, idx FROM new_checklist,
LATERAL (VALUES
  ('Verificar integridade estrutural do container', 1),
  ('Conferir sistema de travamento das portas', 2),
  ('Inspecionar chão do container (sem furos ou danos)', 3),
  ('Verificar kit de ferramentas manuais completo', 4),
  ('Conferir chaves combinadas (conjunto completo)', 5),
  ('Verificar alicates (corte, pressão, universal)', 6),
  ('Conferir martelos e marretas', 7),
  ('Verificar chaves de fenda e Phillips', 8),
  ('Conferir trena e nível', 9),
  ('Verificar equipamentos de segurança (capacete, luvas, óculos)', 10),
  ('Conferir extintor de incêndio', 11),
  ('Verificar kit de primeiros socorros', 12),
  ('Conferir iluminação interna', 13),
  ('Verificar ventilação adequada', 14),
  ('Documentar número de série do container', 15)
) AS items(item, idx);

-- Create indexes for better performance
CREATE INDEX idx_folders_parent ON public.folders(parent_folder_id);
CREATE INDEX idx_folders_category ON public.folders(category);
CREATE INDEX idx_documents_folder ON public.documents(folder_id);
CREATE INDEX idx_document_tags_document ON public.document_tags(document_id);
CREATE INDEX idx_document_tags_tag ON public.document_tags(tag_id);
CREATE INDEX idx_checklist_items_checklist ON public.checklist_items(checklist_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at
  BEFORE UPDATE ON public.checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();