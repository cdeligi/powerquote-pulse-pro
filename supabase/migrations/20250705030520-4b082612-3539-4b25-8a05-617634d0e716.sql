
-- Add user_sessions table for enhanced audit logging
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage sessions" ON public.user_sessions
    FOR ALL USING (true);

CREATE POLICY "Admins can manage all sessions" ON public.user_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'finance')
        )
    );

-- Add margin_limit to app_settings if not exists
INSERT INTO public.app_settings (key, value, description, updated_by)
VALUES (
    'margin_limit', 
    '25',
    'Minimum margin percentage that requires finance approval',
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
) ON CONFLICT (key) DO NOTHING;

-- Create function to revoke user access
CREATE OR REPLACE FUNCTION public.revoke_user_access(
    p_target_user_id UUID,
    p_reason TEXT DEFAULT 'Admin revoked access'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow admins to revoke access
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'finance')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can revoke user access';
    END IF;

    -- Update user status to inactive
    UPDATE public.profiles 
    SET 
        user_status = 'inactive',
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- Revoke all active sessions
    UPDATE public.user_sessions 
    SET 
        is_active = FALSE,
        revoked_at = NOW(),
        revoked_by = auth.uid()
    WHERE user_id = p_target_user_id AND is_active = TRUE;

    -- Log the revocation
    PERFORM public.log_security_event(
        p_target_user_id,
        'access_revoked',
        jsonb_build_object('reason', p_reason, 'revoked_by', auth.uid()),
        NULL,
        NULL,
        'high'
    );

    RETURN TRUE;
END;
$$;

-- Create function to track user session
CREATE OR REPLACE FUNCTION public.track_user_session(
    p_user_id UUID,
    p_session_token TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT '{}',
    p_location_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_id UUID;
BEGIN
    INSERT INTO public.user_sessions (
        user_id, session_token, ip_address, user_agent, 
        device_info, location_data, expires_at
    ) VALUES (
        p_user_id, p_session_token, p_ip_address, p_user_agent,
        p_device_info, p_location_data, NOW() + INTERVAL '30 days'
    ) RETURNING id INTO session_id;
    
    -- Log session creation
    PERFORM public.log_security_event(
        p_user_id,
        'session_created',
        jsonb_build_object(
            'session_id', session_id,
            'ip', p_ip_address,
            'device_info', p_device_info
        ),
        p_ip_address,
        p_user_agent,
        'info'
    );
    
    RETURN session_id;
END;
$$;

-- Update quotes table to store original prices for audit trail
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS price_override_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS requires_finance_approval BOOLEAN DEFAULT FALSE;

-- Create function to check if quote requires finance approval
CREATE OR REPLACE FUNCTION public.check_finance_approval_required(
    p_quote_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    quote_margin NUMERIC;
    margin_limit NUMERIC;
BEGIN
    -- Get quote margin
    SELECT discounted_margin INTO quote_margin
    FROM public.quotes
    WHERE id = p_quote_id;
    
    -- Get margin limit from settings
    SELECT (value::TEXT)::NUMERIC INTO margin_limit
    FROM public.app_settings
    WHERE key = 'margin_limit';
    
    -- Default margin limit if not set
    IF margin_limit IS NULL THEN
        margin_limit := 25;
    END IF;
    
    RETURN quote_margin < margin_limit;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_timestamp ON public.security_audit_logs(timestamp DESC);
