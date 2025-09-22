-- Create user_permissions table for managing user sharing and access control
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'edit', 'admin')),
  resource_type TEXT NOT NULL DEFAULT 'quotes',
  resource_id TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, resource_type, resource_id, permission_type)
);

-- Enable RLS on user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_permissions
CREATE POLICY "Admins can manage all permissions"
ON public.user_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view permissions granted to them"
ON public.user_permissions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view permissions they granted"
ON public.user_permissions  
FOR SELECT
USING (granted_by = auth.uid());

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _permission_type TEXT,
  _resource_type TEXT DEFAULT 'quotes',
  _resource_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_permissions up
    WHERE up.user_id = _user_id
      AND up.permission_type >= _permission_type  -- view < edit < admin
      AND up.resource_type = _resource_type
      AND (up.resource_id IS NULL OR up.resource_id = _resource_id)
      AND up.enabled = true
      AND (up.expires_at IS NULL OR up.expires_at > now())
  ) OR EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = _user_id AND p.role = 'admin'
  );
$$;

-- Add updated_at trigger
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();