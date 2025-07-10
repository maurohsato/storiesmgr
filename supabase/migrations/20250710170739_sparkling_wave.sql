/*
  # Fix infinite recursion in RLS policies

  1. Security Changes
    - Remove recursive policies on profiles table
    - Create simple, non-recursive policies
    - Add helper functions to check permissions safely
    - Ensure proper access control without infinite loops

  2. New Approach
    - Use auth.uid() directly where possible
    - Create separate functions for role checking
    - Avoid self-referencing queries in policies
*/

-- Create helper functions for role checking that don't cause recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  user_role user_role;
BEGIN
  -- Get the role directly from the current user's JWT claims if available
  user_role := (auth.jwt() ->> 'user_role')::user_role;
  
  -- If not in JWT, fall back to database lookup with recursion protection
  IF user_role IS NULL THEN
    SELECT role INTO user_role 
    FROM profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_read_access()
RETURNS boolean AS $$
DECLARE
  user_role user_role;
BEGIN
  -- Get the role directly from the current user's JWT claims if available
  user_role := (auth.jwt() ->> 'user_role')::user_role;
  
  -- If not in JWT, fall back to database lookup with recursion protection
  IF user_role IS NULL THEN
    SELECT role INTO user_role 
    FROM profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(user_role IN ('admin', 'project_manager', 'collaborator'), false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- 5. Admins can read all profiles (using helper function to avoid recursion)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_admin());

-- 6. Admins can update any profile (using helper function to avoid recursion)
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

-- 7. Admins can manage all profiles (insert, delete)
CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update other table policies to use the new helper functions

-- Teams policies
DROP POLICY IF EXISTS "All authenticated users can read teams" ON teams;
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
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- Clients policies
DROP POLICY IF EXISTS "All authenticated users can read clients" ON clients;
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
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- Projects policies
DROP POLICY IF EXISTS "All authenticated users can read projects" ON projects;
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
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- User stories policies
DROP POLICY IF EXISTS "All authenticated users can read user stories" ON user_stories;
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
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])
    )
  );

CREATE POLICY "Users can update own user stories or managers can update all"
  ON user_stories
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

CREATE POLICY "Admins and project managers can delete user stories"
  ON user_stories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_read_access() TO authenticated, anon;

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
  USING (is_admin());

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