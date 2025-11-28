-- Create inspection_reports table for saving draft reports
CREATE TABLE IF NOT EXISTS public.inspection_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_number TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;

-- Users can create their own reports
CREATE POLICY "Users can create own reports"
ON public.inspection_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.inspection_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
ON public.inspection_reports
FOR UPDATE
USING (auth.uid() = user_id);

-- Only admins can delete reports
CREATE POLICY "Only admins can delete reports"
ON public.inspection_reports
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_inspection_reports_updated_at
BEFORE UPDATE ON public.inspection_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_inspection_reports_user_id ON public.inspection_reports(user_id);
CREATE INDEX idx_inspection_reports_status ON public.inspection_reports(status);
CREATE INDEX idx_inspection_reports_updated_at ON public.inspection_reports(updated_at DESC);