/*
  # Fix RLS Policies to Prevent Infinite Recursion

  1. Create helper functions that don't cause recursion
  2. Drop all existing policies completely
  3. Create new, safe policies
  4. Update trigger functions
*/

-- First, let's create helper functions that don't cause recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_management_role()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'project_manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_read_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_create_content()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'project_manager', 'collaborator')
  );
$$;

-- Drop ALL existing policies on profiles table (including any that might exist)
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

-- Create new, non-recursive policies for profiles
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a simple policy for reading profiles that doesn't cause recursion
-- This allows authenticated users to read basic profile info needed for the app
CREATE POLICY "Authenticated users can read basic profile info"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Update other table policies to use the new helper functions
-- Teams policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'teams' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.teams';
    END LOOP;
END $$;

CREATE POLICY "Authorized users can read teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (public.has_read_access());

CREATE POLICY "Project managers and admins can manage teams"
  ON public.teams
  FOR ALL
  TO authenticated
  USING (public.has_management_role())
  WITH CHECK (public.has_management_role());

-- Clients policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'clients' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.clients';
    END LOOP;
END $$;

CREATE POLICY "Authorized users can read clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (public.has_read_access());

CREATE POLICY "Project managers and admins can manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.has_management_role())
  WITH CHECK (public.has_management_role());

-- Projects policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'projects' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.projects';
    END LOOP;
END $$;

CREATE POLICY "Authorized users can read projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (public.has_read_access());

CREATE POLICY "Project managers and admins can manage projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.has_management_role())
  WITH CHECK (public.has_management_role());

-- User Stories policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_stories' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.user_stories';
    END LOOP;
END $$;

CREATE POLICY "Authorized users can read user stories"
  ON public.user_stories
  FOR SELECT
  TO authenticated
  USING (public.has_read_access());

CREATE POLICY "Collaborators can create user stories"
  ON public.user_stories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_create_content());

CREATE POLICY "Users can update own user stories or managers can update all"
  ON public.user_stories
  FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid() AND public.can_create_content()) 
    OR public.has_management_role()
  )
  WITH CHECK (
    (created_by = auth.uid() AND public.can_create_content()) 
    OR public.has_management_role()
  );

CREATE POLICY "Admins and project managers can delete user stories"
  ON public.user_stories
  FOR DELETE
  TO authenticated
  USING (public.has_management_role());

-- Role Changes policies (if table exists)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Check if role_changes table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_changes' AND table_schema = 'public') THEN
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'role_changes' AND schemaname = 'public'
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.role_changes';
        END LOOP;
        
        EXECUTE 'CREATE POLICY "Only admins can read role changes" ON public.role_changes FOR SELECT TO authenticated USING (public.is_admin())';
    END IF;
END $$;

-- Update the trigger function to use auth metadata instead of profile table
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if role actually changed and role_changes table exists
  IF OLD.role IS DISTINCT FROM NEW.role AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'role_changes' AND table_schema = 'public'
  ) THEN
    INSERT INTO public.role_changes (
      user_id,
      old_role,
      new_role,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.role,
      NEW.role,
      auth.uid(),
      'Role updated via profile update'
    );
  END IF;
  
  RETURN NEW;
END;
$$;