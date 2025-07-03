
-- Add finance role to existing enum (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('level1', 'level2', 'admin', 'finance');
    ELSE
        -- Add finance role if it doesn't exist
        BEGIN
            ALTER TYPE user_role_enum ADD VALUE 'finance';
        EXCEPTION
            WHEN duplicate_object THEN
                NULL; -- Role already exists
        END;
    END IF;
END $$;

-- Create security audit log table for enhanced user tracking
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    location_data JSONB,
    session_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    severity TEXT DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- Enable RLS on security audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all audit logs
CREATE POLICY "Admins can view all audit logs" ON public.security_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'finance')
        )
    );

-- Create policy for system to insert audit logs
CREATE POLICY "System can insert audit logs" ON public.security_audit_logs
    FOR INSERT WITH CHECK (true);

-- Add login tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login_ip INET,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_user_id UUID,
    p_action TEXT,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.security_audit_logs (
        user_id, action, details, ip_address, user_agent, severity
    ) VALUES (
        p_user_id, p_action, p_details, p_ip_address, p_user_agent, p_severity
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Create function to update user login info
CREATE OR REPLACE FUNCTION public.update_user_login(
    p_user_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_success THEN
        UPDATE public.profiles 
        SET 
            last_login_at = NOW(),
            last_login_ip = p_ip_address,
            login_count = login_count + 1,
            failed_login_attempts = 0,
            account_locked_until = NULL
        WHERE id = p_user_id;
        
        -- Log successful login
        PERFORM public.log_security_event(
            p_user_id, 
            'login_success', 
            jsonb_build_object('ip', p_ip_address),
            p_ip_address,
            NULL,
            'info'
        );
    ELSE
        UPDATE public.profiles 
        SET failed_login_attempts = failed_login_attempts + 1,
            account_locked_until = CASE 
                WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
                ELSE account_locked_until
            END
        WHERE id = p_user_id;
        
        -- Log failed login
        PERFORM public.log_security_event(
            p_user_id, 
            'login_failed', 
            jsonb_build_object('ip', p_ip_address, 'attempt_count', (SELECT failed_login_attempts FROM profiles WHERE id = p_user_id)),
            p_ip_address,
            NULL,
            'medium'
        );
    END IF;
END;
$$;

-- Create quote analytics view for real margin dashboard
CREATE OR REPLACE VIEW public.quote_analytics AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    DATE_TRUNC('quarter', created_at) as quarter,
    DATE_TRUNC('year', created_at) as year,
    status,
    COUNT(*) as quote_count,
    SUM(original_quote_value) as total_original_value,
    SUM(discounted_value) as total_discounted_value,
    AVG(original_margin) as avg_original_margin,
    AVG(discounted_margin) as avg_discounted_margin,
    SUM(gross_profit) as total_gross_profit,
    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
    currency
FROM public.quotes
GROUP BY DATE_TRUNC('month', created_at), DATE_TRUNC('quarter', created_at), 
         DATE_TRUNC('year', created_at), status, currency;

-- Create RLS policy for quote analytics
CREATE POLICY "Admins can view quote analytics" ON public.quote_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'finance')
        )
    );

-- Update profiles table to allow admin edits
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p2
            WHERE p2.id = auth.uid() AND p2.role IN ('admin', 'finance')
        )
    );
