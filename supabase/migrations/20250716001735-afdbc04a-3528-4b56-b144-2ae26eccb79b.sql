-- Add missing columns to profiles table for extended profile data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS manager_email text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS business_justification text;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_job_title ON public.profiles(job_title);
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON public.profiles(company_name);