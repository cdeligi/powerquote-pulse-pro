
-- Create user_requests table for pending signup approvals
CREATE TABLE user_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  full_name text,
  requested_role text NOT NULL DEFAULT 'level1',
  department text,
  business_justification text,
  requested_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamp with time zone,
  rejection_reason text,
  ip_address text,
  user_agent text
);

-- Create user_sessions table for audit logging
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('login', 'logout', 'session_refresh')),
  ip_address text,
  user_agent text,
  location jsonb DEFAULT '{}',
  device_info jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_requests
ALTER TABLE user_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_requests
CREATE POLICY "Anyone can create user requests" 
  ON user_requests 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can view all user requests" 
  ON user_requests 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update user requests" 
  ON user_requests 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "System can insert session logs" 
  ON user_sessions 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can view all session logs" 
  ON user_sessions 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can view their own sessions" 
  ON user_sessions 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX idx_user_requests_status ON user_requests(status);
CREATE INDEX idx_user_requests_email ON user_requests(email);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_created_at ON user_sessions(created_at DESC);
