-- Create user_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  requested_role TEXT NOT NULL DEFAULT 'level1',
  department TEXT,
  job_title TEXT,
  phone_number TEXT,
  manager_email TEXT,
  company_name TEXT,
  business_justification TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending',
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Drop existing foreign key constraints if they exist
ALTER TABLE public.user_requests DROP CONSTRAINT IF EXISTS user_requests_processed_by_fkey;

-- Add foreign key constraint to profiles table
ALTER TABLE public.user_requests
ADD CONSTRAINT user_requests_processed_by_fkey
  FOREIGN KEY (processed_by) REFERENCES public.profiles(id)
    ON DELETE SET NULL;

-- Fix user_sessions table - add missing event column and foreign key
ALTER TABLE public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS event TEXT DEFAULT 'login';
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS location JSONB DEFAULT '{}';

-- Add foreign key constraint for user_sessions
ALTER TABLE public.user_sessions
ADD CONSTRAINT user_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- Enable RLS on user_requests
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_requests
CREATE POLICY "Admins can manage user requests" ON public.user_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can create registration requests" ON public.user_requests
FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_requests_status ON public.user_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_requests_email ON public.user_requests(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_event ON public.user_sessions(event);