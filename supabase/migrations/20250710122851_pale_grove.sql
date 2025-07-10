/*
  # Fix Admin User Configuration

  1. Security
    - Create function to ensure admin@demo.com is always admin
    - Update policies to allow admin access
    - Fix profile creation for admin user

  2. Changes
    - Ensure admin@demo.com gets admin role
    - Update handle_new_user function
    - Add admin-specific policies
*/

-- Function to ensure admin@demo.com is always admin
CREATE OR REPLACE FUNCTION public.ensure_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  admin_exists boolean;
BEGIN
  -- Find admin user in auth.users
  SELECT id INTO admin_user_id
  FROM auth.users 
  WHERE email = 'admin@demo.com'
  LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Check if profile exists
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE id = admin_user_id
    ) INTO admin_exists;
    
    IF admin_exists THEN
      -- Update role to admin if not already
      UPDATE public.profiles 
      SET 
        role = 'admin'::user_role,
        updated_at = NOW()
      WHERE id = admin_user_id 
      AND role != 'admin'::user_role;
      
      RAISE LOG 'Admin user role updated for %', admin_user_id;
    ELSE
      -- Create admin profile if it doesn't exist
      INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
      VALUES (
        admin_user_id,
        'admin@demo.com',
        'Administrador Sistema',
        'admin'::user_role,
        NOW(),
        NOW()
      );
      
      RAISE LOG 'Admin profile created for %', admin_user_id;
    END IF;
  ELSE
    RAISE LOG 'Admin user admin@demo.com not found in auth.users';
  END IF;
END;
$$;

-- Execute the function to ensure admin
SELECT public.ensure_admin_user();

-- Update handle_new_user function to ensure admin@demo.com is always admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'admin@demo.com' THEN
    user_role_value := 'admin'::user_role;
  ELSE
    user_role_value := 'reader'::user_role;
  END IF;

  -- Insert or update profile
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', ''),
    user_role_value,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = CASE 
      WHEN EXCLUDED.email = 'admin@demo.com' THEN 'admin'::user_role
      ELSE profiles.role
    END,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE LOG 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing admin policies to recreate them
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Policy to allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own profile
    auth.uid() = id
    OR
    -- Admins can see all profiles
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'::user_role
    )
  );

-- Policy to allow admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    auth.uid() = id
    OR
    -- Admins can update any profile
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'::user_role
    )
  )
  WITH CHECK (
    -- Users can update their own profile (but not change role unless admin)
    (auth.uid() = id AND (
      -- If not changing role, allow
      NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role != NEW.role)
      OR
      -- If admin, allow role changes
      EXISTS (
        SELECT 1 FROM public.profiles admin_profile
        WHERE admin_profile.id = auth.uid() 
        AND admin_profile.role = 'admin'::user_role
      )
    ))
    OR
    -- Admins can update any profile including role
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'::user_role
    )
  );

-- Execute again to ensure admin user is properly set up
SELECT public.ensure_admin_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_admin_user() TO authenticated, service_role;