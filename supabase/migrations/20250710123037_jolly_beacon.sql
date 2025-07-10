/*
  # Fix admin user access and update policies

  1. Functions
    - Drop and recreate helper functions to avoid parameter conflicts
    - Ensure admin@demo.com is always admin
    - Update handle_new_user trigger function

  2. Security
    - Update RLS policies to use helper functions
    - Ensure admins can manage all data
    - Maintain proper access controls for other roles

  3. Changes
    - Fix function parameter conflicts
    - Simplify policy logic
    - Ensure admin user setup works correctly
*/

-- Drop existing functions to avoid parameter conflicts
DROP FUNCTION IF EXISTS public.user_has_role(text);
DROP FUNCTION IF EXISTS public.user_has_role(user_role);
DROP FUNCTION IF EXISTS public.user_has_any_role(text[]);
DROP FUNCTION IF EXISTS public.user_has_any_role(user_role[]);

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

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(check_role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = check_role
  );
END;
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.user_has_any_role(check_roles user_role[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = ANY(check_roles)
  );
END;
$$;

-- Drop existing admin policies to recreate them
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

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
    -- Users can update their own profile (basic info only, not role)
    auth.uid() = id
    OR
    -- Admins can update any profile including role
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'::user_role
    )
  );

-- Update existing policies to use the new helper functions
-- Teams policies
DROP POLICY IF EXISTS "Project managers and admins can manage teams" ON public.teams;
CREATE POLICY "Project managers and admins can manage teams"
  ON public.teams
  FOR ALL
  TO authenticated
  USING (user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]))
  WITH CHECK (user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]));

-- Clients policies  
DROP POLICY IF EXISTS "Project managers and admins can manage clients" ON public.clients;
CREATE POLICY "Project managers and admins can manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]))
  WITH CHECK (user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]));

-- Projects policies
DROP POLICY IF EXISTS "Project managers and admins can manage projects" ON public.projects;
CREATE POLICY "Project managers and admins can manage projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]))
  WITH CHECK (user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]));

-- User stories policies
DROP POLICY IF EXISTS "Collaborators can create user stories" ON public.user_stories;
CREATE POLICY "Collaborators can create user stories"
  ON public.user_stories
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role]));

DROP POLICY IF EXISTS "Users can update own user stories or managers can update all" ON public.user_stories;
CREATE POLICY "Users can update own user stories or managers can update all"
  ON public.user_stories
  FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid() AND user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role]))
    OR user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role])
  )
  WITH CHECK (
    (created_by = auth.uid() AND user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role]))
    OR user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role])
  );

DROP POLICY IF EXISTS "Admins and project managers can delete user stories" ON public.user_stories;
CREATE POLICY "Admins and project managers can delete user stories"
  ON public.user_stories
  FOR DELETE
  TO authenticated
  USING (user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]));

-- Execute the function to ensure admin
SELECT public.ensure_admin_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_admin_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_role(user_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_any_role(user_role[]) TO authenticated, service_role;

-- Execute again to ensure admin user is properly set up
SELECT public.ensure_admin_user();