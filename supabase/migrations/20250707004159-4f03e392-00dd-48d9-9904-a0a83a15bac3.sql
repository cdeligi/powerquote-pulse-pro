
-- Create user_sessions table for activity monitoring
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token text NOT NULL,
  ip_address text,
  user_agent text,
  device_info jsonb DEFAULT '{}',
  location_data jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  revoked_at timestamp with time zone,
  revoked_reason text
);

-- Add RLS policies for user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions" ON public.user_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- System can insert sessions
CREATE POLICY "System can insert sessions" ON public.user_sessions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update sessions (for revocation)
CREATE POLICY "Admins can update sessions" ON public.user_sessions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create security_events table for logging
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  severity text DEFAULT 'info',
  created_at timestamp with time zone DEFAULT now()
);

-- Add RLS for security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events" ON public.security_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- System can insert security events
CREATE POLICY "System can insert security events" ON public.security_events
FOR INSERT WITH CHECK (true);

-- Create user_login_attempts table
CREATE TABLE public.user_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  success boolean DEFAULT false,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add RLS for user_login_attempts
ALTER TABLE public.user_login_attempts ENABLE ROW LEVEL SECURITY;

-- Admins can view login attempts
CREATE POLICY "Admins can view login attempts" ON public.user_login_attempts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- System can insert login attempts
CREATE POLICY "System can insert login attempts" ON public.user_login_attempts
FOR INSERT WITH CHECK (true);

-- Database functions for session management
CREATE OR REPLACE FUNCTION public.track_user_session(
  p_user_id uuid,
  p_session_token text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_info jsonb DEFAULT '{}',
  p_location_data jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id uuid;
BEGIN
  -- Insert new session record
  INSERT INTO public.user_sessions (
    user_id, session_token, ip_address, user_agent, 
    device_info, location_data
  ) VALUES (
    p_user_id, p_session_token, p_ip_address, p_user_agent,
    p_device_info, p_location_data
  ) RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_user_access(
  p_target_user_id uuid,
  p_reason text DEFAULT 'Access revoked by admin'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow admins to revoke access
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can revoke user access';
  END IF;

  -- Revoke all active sessions for the user
  UPDATE public.user_sessions 
  SET 
    is_active = false,
    revoked_at = now(),
    revoked_reason = p_reason
  WHERE user_id = p_target_user_id AND is_active = true;

  -- Log the security event
  INSERT INTO public.security_events (
    user_id, action, details, severity
  ) VALUES (
    p_target_user_id, 'access_revoked', 
    jsonb_build_object('reason', p_reason, 'revoked_by', auth.uid()),
    'warning'
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_action text,
  p_details jsonb DEFAULT '{}',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    user_id, action, details, ip_address, user_agent, severity
  ) VALUES (
    p_user_id, p_action, p_details, p_ip_address, p_user_agent, p_severity
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_login(
  p_user_id uuid,
  p_success boolean,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_id uuid;
  user_email text;
BEGIN
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = p_user_id;
  
  -- Insert login attempt record
  INSERT INTO public.user_login_attempts (
    user_id, email, success, ip_address, user_agent
  ) VALUES (
    p_user_id, user_email, p_success, p_ip_address, p_user_agent
  ) RETURNING id INTO attempt_id;
  
  RETURN attempt_id;
END;
$$;

-- Update last activity function
CREATE OR REPLACE FUNCTION public.update_session_activity(
  p_session_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_sessions 
  SET last_activity = now()
  WHERE session_token = p_session_token AND is_active = true;
  
  RETURN FOUND;
END;
$$;
