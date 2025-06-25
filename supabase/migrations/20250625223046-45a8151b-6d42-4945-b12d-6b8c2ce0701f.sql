
-- Add copyright notice and enhance user management
-- © 2025 Qualitrol Corp. All rights reserved.

-- Add user_status to profiles table for soft deletion
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'active' CHECK (user_status IN ('active', 'inactive', 'suspended'));

-- Create admin_notifications table for tracking notifications sent to admins
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'quote_pending_approval',
  sent_to UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  message_content JSONB DEFAULT '{}'
);

-- Enable RLS on admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view notifications
CREATE POLICY "Admins can view notifications" ON public.admin_notifications
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_status ON public.profiles(user_status);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_quote_id ON public.admin_notifications(quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

-- Function to get all admin user IDs
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT id 
    FROM public.profiles 
    WHERE role = 'admin' AND user_status = 'active'
  );
$$;

-- Function to mark user as inactive (soft delete)
CREATE OR REPLACE FUNCTION public.deactivate_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow admins to deactivate users
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can deactivate users';
  END IF;

  -- Don't allow deactivating other admins
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = target_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Cannot deactivate admin users';
  END IF;

  -- Update user status to inactive
  UPDATE public.profiles 
  SET user_status = 'inactive', updated_at = now()
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;
