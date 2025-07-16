
-- Fix user_requests table structure and relationships
ALTER TABLE public.user_requests 
DROP CONSTRAINT IF EXISTS user_requests_processed_by_fkey;

-- Add missing columns to user_requests for complete profile data
ALTER TABLE public.user_requests
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS manager_email text,
ADD COLUMN IF NOT EXISTS company_name text;

-- Update the processed_by foreign key to reference profiles instead of auth.users
ALTER TABLE public.user_requests
ADD CONSTRAINT user_requests_processed_by_fkey
  FOREIGN KEY (processed_by) REFERENCES public.profiles(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Add missing columns to profiles table for extended profile data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS manager_email text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS business_justification text;

-- Create proper indexes
CREATE INDEX IF NOT EXISTS idx_user_requests_processed_by ON user_requests(processed_by);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
