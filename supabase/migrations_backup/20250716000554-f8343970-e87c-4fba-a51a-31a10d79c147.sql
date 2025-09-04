-- Fix user_sessions table constraints
ALTER TABLE public.user_sessions ALTER COLUMN session_token DROP NOT NULL;

-- Update user_sessions to allow proper session tracking
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS browser_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Create index for better performance on session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON public.user_sessions(last_activity);

-- Update RLS policies for user_sessions to allow proper session management
DROP POLICY IF EXISTS "System can insert sessions" ON public.user_sessions;
CREATE POLICY "System can insert sessions" ON public.user_sessions
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update sessions" ON public.user_sessions;
CREATE POLICY "System can update sessions" ON public.user_sessions
FOR UPDATE USING (true);