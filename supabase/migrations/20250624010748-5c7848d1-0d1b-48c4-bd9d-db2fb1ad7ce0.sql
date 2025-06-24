
-- Update user role to admin for the current authenticated user
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'cdeligi@qualitrolcorp.com';
