-- Create report_knowledge table to store extracted learning from reports
CREATE TABLE IF NOT EXISTS public.report_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.inspection_reports(id) ON DELETE CASCADE,
  uploaded_file_path TEXT,
  scope_type TEXT NOT NULL,
  client TEXT,
  extracted_data JSONB,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  strengths TEXT[],
  improvements TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create report_patterns table to store learned patterns by scope
CREATE TABLE IF NOT EXISTS public.report_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('best_practice', 'common_issue', 'recommendation')),
  description TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  average_score DECIMAL(5,2),
  examples JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_report_knowledge_scope ON public.report_knowledge(scope_type);
CREATE INDEX IF NOT EXISTS idx_report_knowledge_score ON public.report_knowledge(quality_score);
CREATE INDEX IF NOT EXISTS idx_report_patterns_scope ON public.report_patterns(scope_type);
CREATE INDEX IF NOT EXISTS idx_report_patterns_type ON public.report_patterns(pattern_type);

-- Enable RLS
ALTER TABLE public.report_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_knowledge
CREATE POLICY "All authenticated can create report knowledge"
  ON public.report_knowledge
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "All authenticated can view report knowledge"
  ON public.report_knowledge
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own report knowledge"
  ON public.report_knowledge
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Only admins can delete report knowledge"
  ON public.report_knowledge
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for report_patterns
CREATE POLICY "All authenticated can view report patterns"
  ON public.report_patterns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create report patterns"
  ON public.report_patterns
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update report patterns"
  ON public.report_patterns
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can delete report patterns"
  ON public.report_patterns
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at on report_patterns
CREATE TRIGGER update_report_patterns_updated_at
  BEFORE UPDATE ON public.report_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();