/*
  # Fix RLS Policy Infinite Recursion

  1. Clean up all existing policies and functions
  2. Create new helper functions that don't cause recursion
  3. Recreate all RLS policies using the new functions
  4. Update trigger functions
*/

-- Step 1: Drop ALL existing policies on all tables first
DO $$
DECLARE
    policy_record RECORD;
    target_table TEXT;
BEGIN
    -- List of tables to clean policies from
    FOR target_table IN VALUES ('profiles'), ('teams'), ('clients'), ('projects'), ('user_stories'), ('role_changes')
    LOOP
        -- Check if table exists before trying to drop policies
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE information_schema.tables.table_name = target_table AND information_schema.tables.table_schema = 'public') THEN
            FOR policy_record IN 
                SELECT policyname 
                FROM pg_policies 
                WHERE tablename = target_table AND schemaname = 'public'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, target_table);
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- Step 2: Drop existing functions with CASCADE to remove all dependencies
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.has_management_role() CASCADE;
DROP FUNCTION IF EXISTS public.has_read_access() CASCADE;
DROP FUNCTION IF EXISTS public.can_create_content() CASCADE;

-- Also drop any functions with different signatures that might exist
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND proname IN ('is_admin', 'has_management_role', 'has_read_access', 'can_create_content')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', func_record.proname, func_record.args);
    END LOOP;
END $$;

-- Step 3: Create helper functions with explicit signatures that don't cause recursion
CREATE FUNCTION public.is_admin()
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

CREATE FUNCTION public.has_management_role()
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

CREATE FUNCTION public.has_read_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE FUNCTION public.can_create_content()
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

-- Step 4: Create new, non-recursive policies for profiles
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

-- Step 5: Teams policies
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

-- Step 6: Clients policies
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

-- Step 7: Projects policies
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

-- Step 8: User Stories policies
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

-- Step 9: Role Changes policies (if table exists)
DO $$
BEGIN
    -- Check if role_changes table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE information_schema.tables.table_name = 'role_changes' AND information_schema.tables.table_schema = 'public') THEN
        EXECUTE 'CREATE POLICY "Only admins can read role changes" ON public.role_changes FOR SELECT TO authenticated USING (public.is_admin())';
    END IF;
END $$;

-- Step 10: Update the trigger function to use auth metadata instead of profile table
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
    WHERE information_schema.tables.table_name = 'role_changes' AND information_schema.tables.table_schema = 'public'
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