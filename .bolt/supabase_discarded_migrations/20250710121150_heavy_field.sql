/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Current policies on profiles table are causing infinite recursion
    - Other tables' policies check user roles by querying profiles table
    - This creates circular dependencies when profiles policies also query profiles

  2. Solution
    - Simplify profiles table policies to avoid self-referencing
    - Use direct auth.uid() checks instead of subqueries to profiles table
    - Maintain security while eliminating recursion

  3. Changes
    - Drop existing problematic policies on profiles table
    - Create new simplified policies that don't cause recursion
    - Ensure users can still read/update their own profiles
    - Maintain admin access without circular references
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own basic info" ON profiles;

-- Create new simplified policies that avoid recursion

-- Allow users to read their own profile (no subquery to profiles needed)
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile (excluding role changes)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = OLD.role);

-- Allow users to insert their own profile during registration
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role to insert profiles (for user registration)
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role full access (for admin operations via backend)
CREATE POLICY "Service role full access"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a function to check if current user is admin (to be used by other tables)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  );
$$;

-- Create a function to check if current user has management privileges
CREATE OR REPLACE FUNCTION has_management_role()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
  );
$$;

-- Create a function to check if current user has read access
CREATE OR REPLACE FUNCTION has_read_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])
  );
$$;

-- Update other table policies to use the new functions instead of direct subqueries
-- This prevents the circular dependency issue

-- Update teams policies
DROP POLICY IF EXISTS "Authorized users can read teams" ON teams;
DROP POLICY IF EXISTS "Project managers and admins can manage teams" ON teams;

CREATE POLICY "Authorized users can read teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (has_read_access());

CREATE POLICY "Project managers and admins can manage teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (has_management_role())
  WITH CHECK (has_management_role());

-- Update clients policies
DROP POLICY IF EXISTS "Authorized users can read clients" ON clients;
DROP POLICY IF EXISTS "Project managers and admins can manage clients" ON clients;

CREATE POLICY "Authorized users can read clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (has_read_access());

CREATE POLICY "Project managers and admins can manage clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (has_management_role())
  WITH CHECK (has_management_role());

-- Update projects policies
DROP POLICY IF EXISTS "Authorized users can read projects" ON projects;
DROP POLICY IF EXISTS "Project managers and admins can manage projects" ON projects;

CREATE POLICY "Authorized users can read projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (has_read_access());

CREATE POLICY "Project managers and admins can manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (has_management_role())
  WITH CHECK (has_management_role());

-- Update user_stories policies
DROP POLICY IF EXISTS "Authorized users can read user stories" ON user_stories;
DROP POLICY IF EXISTS "Admins and project managers can delete user stories" ON user_stories;
DROP POLICY IF EXISTS "Collaborators can create user stories" ON user_stories;
DROP POLICY IF EXISTS "Users can update own user stories or managers can update all" ON user_stories;

CREATE POLICY "Authorized users can read user stories"
  ON user_stories
  FOR SELECT
  TO authenticated
  USING (has_read_access());

CREATE POLICY "Collaborators can create user stories"
  ON user_stories
  FOR INSERT
  TO authenticated
  WITH CHECK (has_read_access());

CREATE POLICY "Users can update own user stories or managers can update all"
  ON user_stories
  FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid() AND has_read_access()) 
    OR has_management_role()
  )
  WITH CHECK (
    (created_by = auth.uid() AND has_read_access()) 
    OR has_management_role()
  );

CREATE POLICY "Admins and project managers can delete user stories"
  ON user_stories
  FOR DELETE
  TO authenticated
  USING (has_management_role());

-- Update role_changes policies
DROP POLICY IF EXISTS "Only admins can read role changes" ON role_changes;

CREATE POLICY "Only admins can read role changes"
  ON role_changes
  FOR SELECT
  TO authenticated
  USING (is_admin());