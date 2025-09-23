-- Fix the has_permission function to use proper search_path
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
SET search_path = public
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