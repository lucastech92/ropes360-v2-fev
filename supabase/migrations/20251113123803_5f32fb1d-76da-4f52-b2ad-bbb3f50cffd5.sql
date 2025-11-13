-- Add company and position columns to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS position TEXT;