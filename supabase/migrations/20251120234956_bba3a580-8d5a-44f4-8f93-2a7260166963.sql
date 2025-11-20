-- Add language_preference column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN language_preference TEXT DEFAULT 'pt-BR' CHECK (language_preference IN ('pt-BR', 'en-US', 'es-ES'));