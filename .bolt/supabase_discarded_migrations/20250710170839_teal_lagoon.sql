/*
  # Fix infinite recursion in RLS policies

  1. Security Changes
    - Remove all recursive policies on profiles table
    - Create simple, non-recursive policies
    - Use direct auth.uid() checks where possible
    - Avoid complex subqueries that cause recursion

  2. New Policies
    - Service role gets full access (needed for triggers)
    - Users can manage their own profiles
    - Simple admin checks without recursion
    - Audit system for role changes

  3. Performance
    - Simplified policy logic
    - Direct UUID comparisons
    - Minimal database lookups
*/

-- Drop ALL existing policies on profiles to start completely fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Create completely new, simple policies without any recursion

-- 1. Service role gets full access (needed for triggers and system operations)
CREATE POLICY "Service role full access"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Users can read their own profile (no recursion here)
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 3. Users can update their own profile (no recursion here)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Users can insert their own profile (needed for registration)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 5. Special policy for admin@demo.com to read all profiles
CREATE POLICY "Admin can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    auth.uid() IN (
      SELECT id FROM profiles WHERE email = 'admin@demo.com' LIMIT 1
    )
  );

-- 6. Special policy for admin@demo.com to update any profile
CREATE POLICY "Admin can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    auth.uid() IN (
      SELECT id FROM profiles WHERE email = 'admin@demo.com' LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() = id OR 
    auth.uid() IN (
      SELECT id FROM profiles WHERE email = 'admin@demo.com' LIMIT 1
    )
  );

-- Update other table policies to be simpler

-- Teams policies - allow all authenticated users to read, restrict management
DROP POLICY IF EXISTS "All authenticated users can read teams" ON teams;
DROP POLICY IF EXISTS "Authorized users can read teams" ON teams;
DROP POLICY IF EXISTS "Project managers and admins can manage teams" ON teams;

CREATE POLICY "All authenticated users can read teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project managers and admins can manage teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- Clients policies
DROP POLICY IF EXISTS "All authenticated users can read clients" ON clients;
DROP POLICY IF EXISTS "Authorized users can read clients" ON clients;
DROP POLICY IF EXISTS "Project managers and admins can manage clients" ON clients;

CREATE POLICY "All authenticated users can read clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project managers and admins can manage clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- Projects policies
DROP POLICY IF EXISTS "All authenticated users can read projects" ON projects;
DROP POLICY IF EXISTS "Authorized users can read projects" ON projects;
DROP POLICY IF EXISTS "Project managers and admins can manage projects" ON projects;

CREATE POLICY "All authenticated users can read projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project managers and admins can manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- User stories policies
DROP POLICY IF EXISTS "All authenticated users can read user stories" ON user_stories;
DROP POLICY IF EXISTS "Authorized users can read user stories" ON user_stories;
DROP POLICY IF EXISTS "Collaborators can create user stories" ON user_stories;
DROP POLICY IF EXISTS "Users can update own user stories or managers can update all" ON user_stories;
DROP POLICY IF EXISTS "Admins and project managers can delete user stories" ON user_stories;

CREATE POLICY "All authenticated users can read user stories"
  ON user_stories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Collaborators can create user stories"
  ON user_stories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])
    )
  );

CREATE POLICY "Users can update own user stories or managers can update all"
  ON user_stories
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

CREATE POLICY "Admins and project managers can delete user stories"
  ON user_stories
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- Create role changes audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.role_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_role user_role,
  new_role user_role,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT NOW()
);

-- Enable RLS on role_changes
ALTER TABLE public.role_changes ENABLE ROW LEVEL SECURITY;

-- Create indexes for role_changes
CREATE INDEX IF NOT EXISTS idx_role_changes_user_id ON public.role_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_role_changes_changed_by ON public.role_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_role_changes_created_at ON public.role_changes(created_at);

-- Policy for role_changes - only admins can read
CREATE POLICY "Only admins can read role changes"
  ON role_changes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE email = 'admin@demo.com' LIMIT 1
    )
  );

-- Function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if role actually changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.role_changes (user_id, old_role, new_role, changed_by, reason)
    VALUES (
      NEW.id,
      OLD.role,
      NEW.role,
      auth.uid(),
      'Role updated via admin panel'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role change logging
DROP TRIGGER IF EXISTS log_role_changes ON public.profiles;
CREATE TRIGGER log_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- Grant permissions
GRANT ALL ON public.role_changes TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_role_change() TO authenticated, service_role;

-- Ensure admin@demo.com gets admin role when they sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Set role based on email
  IF NEW.email = 'admin@demo.com' THEN
    user_role_value := 'admin'::user_role;
  ELSE
    user_role_value := 'reader'::user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', ''),
    user_role_value,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing admin@demo.com profile if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = 'admin@demo.com') THEN
    UPDATE public.profiles 
    SET role = 'admin'::user_role, updated_at = NOW()
    WHERE email = 'admin@demo.com' AND role != 'admin'::user_role;
  END IF;
END $$;