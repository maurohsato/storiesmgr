/*
  # Fix RLS Policies and Function Conflicts

  1. Drop existing conflicting functions
  2. Create new helper functions with explicit signatures
  3. Update all RLS policies to use new functions
  4. Ensure no circular dependencies in policies
*/

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.has_management_role();
DROP FUNCTION IF EXISTS public.has_read_access();
DROP FUNCTION IF EXISTS public.can_create_content();

-- Create helper functions with explicit signatures that don't cause recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
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
STABLE
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
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_create_content()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'project_manager', 'collaborator')
  );
$$;

-- Drop ALL existing policies on all tables
DO $$
DECLARE
    policy_record RECORD;
    table_name TEXT;
BEGIN
    -- List of tables to clean policies from
    FOR table_name IN VALUES ('profiles'), ('teams'), ('clients'), ('projects'), ('user_stories'), ('role_changes')
    LOOP
        -- Check if table exists before trying to drop policies
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            FOR policy_record IN 
                SELECT policyname 
                FROM pg_policies 
                WHERE tablename = table_name AND schemaname = 'public'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_name);
            END LOOP;
        END IF;
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

-- Teams policies
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
BEGIN
    -- Check if role_changes table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_changes' AND table_schema = 'public') THEN
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