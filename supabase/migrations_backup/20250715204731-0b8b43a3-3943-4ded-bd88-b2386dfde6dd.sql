-- Create admin user cdeligi@qualitrolcorp.com if it doesn't exist
-- Note: This is a data seed, not a user creation through auth API

-- First, ensure the admin user exists in profiles table
INSERT INTO public.profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  department,
  user_status,
  created_at,
  updated_at
) VALUES (
  '7f6234f4-a195-4fae-a4e0-fa30c4026c6f'::uuid,
  'cdeligi@qualitrolcorp.com',
  'Carlos',
  'Deligi',
  'admin',
  'IT',
  'active',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  user_status = EXCLUDED.user_status,
  updated_at = now();

-- Create an admin function to create users (requires admin role)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_role text,
  p_department text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  result json;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can create users';
  END IF;

  -- Validate email format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = p_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();

  -- Insert into profiles table (this will be the main user record)
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    department,
    user_status,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_email,
    p_first_name,
    p_last_name,
    p_role,
    p_department,
    'active',
    now(),
    now()
  );

  -- Log the user creation
  INSERT INTO public.security_events (
    user_id,
    action,
    details,
    severity
  ) VALUES (
    auth.uid(),
    'user_created',
    jsonb_build_object(
      'created_user_id', new_user_id,
      'created_user_email', p_email,
      'created_user_role', p_role
    ),
    'info'
  );

  -- Return success result
  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', p_email,
    'message', 'User created successfully'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create user'
    );
    RETURN result;
END;
$$;

-- Create function to list all users (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  department text,
  user_status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can list users';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.department,
    p.user_status,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Create function to update user status (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_user_status(
  p_user_id uuid,
  p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  target_user_email text;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update user status';
  END IF;

  -- Get target user email for logging
  SELECT email INTO target_user_email
  FROM public.profiles
  WHERE id = p_user_id;

  IF target_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update user status
  UPDATE public.profiles
  SET 
    user_status = p_status,
    updated_at = now()
  WHERE id = p_user_id;

  -- Log the status change
  INSERT INTO public.security_events (
    user_id,
    action,
    details,
    severity
  ) VALUES (
    auth.uid(),
    'user_status_changed',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_user_email', target_user_email,
      'new_status', p_status
    ),
    'info'
  );

  result := json_build_object(
    'success', true,
    'message', 'User status updated successfully'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to update user status'
    );
    RETURN result;
END;
$$;