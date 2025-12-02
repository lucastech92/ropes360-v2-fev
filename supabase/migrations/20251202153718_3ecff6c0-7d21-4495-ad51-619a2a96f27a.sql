-- Create enum for check-in types
CREATE TYPE check_in_type AS ENUM (
  'home_office', 
  'offshore', 
  'travel', 
  'base', 
  'day_off', 
  'vacation'
);

-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  check_in_type check_in_type NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Um registro por dia por usuário
  UNIQUE(user_id, entry_date)
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own entries
CREATE POLICY "Users can view own entries" ON public.time_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own entries
CREATE POLICY "Users can create own entries" ON public.time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update own entries" ON public.time_entries
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete own entries" ON public.time_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Admin/Moderator can view all entries
CREATE POLICY "Admins and moderators can view all entries" ON public.time_entries
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'moderator'::app_role)
  );

-- Admin can update any entry
CREATE POLICY "Admins can update any entry" ON public.time_entries
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete any entry
CREATE POLICY "Admins can delete any entry" ON public.time_entries
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_time_entries_user_date ON public.time_entries(user_id, entry_date);
CREATE INDEX idx_time_entries_date ON public.time_entries(entry_date);

-- Trigger for updated_at
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();