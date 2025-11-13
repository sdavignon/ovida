-- Migration to automatically set admin role for specific users
-- This migration creates a trigger that sets the role to 'admin' for sdavignon1@gmail.com

-- Create a function to set admin role for specific emails
CREATE OR REPLACE FUNCTION public.set_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user's email matches the admin email
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = NEW.user_id
    AND email = 'sdavignon1@gmail.com'
  ) THEN
    NEW.role := 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before insert on profiles
DROP TRIGGER IF EXISTS set_admin_role_trigger ON public.profiles;
CREATE TRIGGER set_admin_role_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_admin_role();

-- Update existing profile if it exists
UPDATE public.profiles
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'sdavignon1@gmail.com'
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.set_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_role() TO service_role;
