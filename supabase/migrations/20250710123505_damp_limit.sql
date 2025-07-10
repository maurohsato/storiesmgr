/*
  # Comprehensive Database Reset and Restructure

  1. Cleanup
    - Remove all triggers first
    - Drop all policies
    - Drop all functions
    - Clear all data

  2. Core Functions
    - User role management functions
    - Permission checking functions
    - Utility functions

  3. Security Policies
    - RLS policies for all tables
    - Role-based access control

  4. Triggers and Automation
    - Auto profile creation
    - Timestamp updates
    - Role change logging

  5. Demo Users Setup
    - Initialize demo accounts with correct roles
*/

-- =====================================================
-- 1. CLEANUP: Remove triggers, policies, functions, and data
-- =====================================================

-- Drop all triggers first (to avoid dependency issues)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_user_stories_updated_at ON public.user_stories;
DROP TRIGGER IF EXISTS log_role_changes ON public.profiles;

-- Drop all existing policies
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile basic info" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

DROP POLICY IF EXISTS "Authorized users can read teams" ON public.teams;
DROP POLICY IF EXISTS "Project managers and admins can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Managers can manage teams" ON public.teams;

DROP POLICY IF EXISTS "Authorized users can read clients" ON public.clients;
DROP POLICY IF EXISTS "Project managers and admins can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Managers can manage clients" ON public.clients;

DROP POLICY IF EXISTS "Authorized users can read projects" ON public.projects;
DROP POLICY IF EXISTS "Project managers and admins can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can manage projects" ON public.projects;

DROP POLICY IF EXISTS "Authorized users can read user stories" ON public.user_stories;
DROP POLICY IF EXISTS "Collaborators can create user stories" ON public.user_stories;
DROP POLICY IF EXISTS "Content creators can create user stories" ON public.user_stories;
DROP POLICY IF EXISTS "Users can update own user stories or managers can update all" ON public.user_stories;
DROP POLICY IF EXISTS "Users can update own stories or managers can update all" ON public.user_stories;
DROP POLICY IF EXISTS "Admins and project managers can delete user stories" ON public.user_stories;
DROP POLICY IF EXISTS "Managers can delete user stories" ON public.user_stories;

DROP POLICY IF EXISTS "Only admins can read role changes" ON public.role_changes;

-- Now drop all functions (after triggers are removed)
DROP FUNCTION IF EXISTS public.user_has_role(text) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_role(user_role) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_any_role(text[]) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_any_role(user_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_content() CASCADE;
DROP FUNCTION IF EXISTS public.can_create_content() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_admin_user() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_demo_users() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.log_role_change() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Clear all data from tables (in correct order due to foreign keys)
TRUNCATE TABLE public.user_stories CASCADE;
TRUNCATE TABLE public.projects CASCADE;
TRUNCATE TABLE public.clients CASCADE;
TRUNCATE TABLE public.teams CASCADE;
TRUNCATE TABLE public.role_changes CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- =====================================================
-- 2. CORE FUNCTIONS: Create robust helper functions
-- =====================================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role_value, 'reader'::user_role);
END;
$$;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(required_role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role() = required_role;
END;
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.user_has_any_role(required_roles user_role[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role() = ANY(required_roles);
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.user_has_role('admin'::user_role);
END;
$$;

-- Function to check if user can manage content (admin or project_manager)
CREATE OR REPLACE FUNCTION public.can_manage_content()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]);
END;
$$;

-- Function to check if user can create content (admin, project_manager, or collaborator)
CREATE OR REPLACE FUNCTION public.can_create_content()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role]);
END;
$$;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if role actually changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.role_changes (user_id, old_role, new_role, changed_by, reason, created_at)
    VALUES (
      NEW.id,
      OLD.role,
      NEW.role,
      auth.uid(),
      'Role updated via system',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value user_role;
  user_full_name text;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'admin@demo.com' THEN
    user_role_value := 'admin'::user_role;
  ELSIF NEW.email = 'manager@demo.com' THEN
    user_role_value := 'project_manager'::user_role;
  ELSIF NEW.email = 'collab@demo.com' THEN
    user_role_value := 'collaborator'::user_role;
  ELSIF NEW.email = 'reader@demo.com' THEN
    user_role_value := 'reader'::user_role;
  ELSE
    user_role_value := 'reader'::user_role;
  END IF;

  -- Extract full name from metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'fullName',
    NEW.raw_user_meta_data->>'name',
    ''
  );

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_role_value,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = CASE 
      WHEN EXCLUDED.email = 'admin@demo.com' THEN 'admin'::user_role
      WHEN EXCLUDED.email = 'manager@demo.com' THEN 'project_manager'::user_role
      WHEN EXCLUDED.email = 'collab@demo.com' THEN 'collaborator'::user_role
      WHEN EXCLUDED.email = 'reader@demo.com' THEN 'reader'::user_role
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

-- Function to ensure demo users exist with correct roles
CREATE OR REPLACE FUNCTION public.ensure_demo_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  demo_emails text[] := ARRAY['admin@demo.com', 'manager@demo.com', 'collab@demo.com', 'reader@demo.com'];
  demo_roles user_role[] := ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role, 'reader'::user_role];
  demo_names text[] := ARRAY['Administrador Sistema', 'Gerente de Projeto', 'Colaborador', 'Usuário Leitor'];
  user_id uuid;
  i integer;
BEGIN
  FOR i IN 1..array_length(demo_emails, 1) LOOP
    -- Check if user exists in auth.users
    SELECT id INTO user_id
    FROM auth.users 
    WHERE email = demo_emails[i]
    LIMIT 1;
    
    IF user_id IS NOT NULL THEN
      -- Update or insert profile
      INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
      VALUES (
        user_id,
        demo_emails[i],
        demo_names[i],
        demo_roles[i],
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        updated_at = NOW();
      
      RAISE LOG 'Demo user % ensured with role %', demo_emails[i], demo_roles[i];
    ELSE
      RAISE LOG 'Demo user % not found in auth.users', demo_emails[i];
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- 3. SECURITY POLICIES: Implement consistent RLS
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile basic info"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage teams"
  ON public.teams
  FOR ALL
  TO authenticated
  USING (public.can_manage_content())
  WITH CHECK (public.can_manage_content());

-- Clients policies
CREATE POLICY "Authorized users can read clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.can_manage_content())
  WITH CHECK (public.can_manage_content());

-- Projects policies
CREATE POLICY "Authorized users can read projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.can_manage_content())
  WITH CHECK (public.can_manage_content());

-- User stories policies
CREATE POLICY "Authorized users can read user stories"
  ON public.user_stories
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Content creators can create user stories"
  ON public.user_stories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_create_content());

CREATE POLICY "Users can update own stories or managers can update all"
  ON public.user_stories
  FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid() AND public.can_create_content())
    OR public.can_manage_content()
  )
  WITH CHECK (
    (created_by = auth.uid() AND public.can_create_content())
    OR public.can_manage_content()
  );

CREATE POLICY "Managers can delete user stories"
  ON public.user_stories
  FOR DELETE
  TO authenticated
  USING (public.can_manage_content());

-- Role changes policies
CREATE POLICY "Only admins can read role changes"
  ON public.role_changes
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- =====================================================
-- 4. TRIGGERS: Set up automation
-- =====================================================

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_stories_updated_at
  BEFORE UPDATE ON public.user_stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for role change logging
CREATE TRIGGER log_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- =====================================================
-- 5. PERMISSIONS: Grant necessary permissions
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_role(user_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_any_role(user_role[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_content() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_create_content() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_demo_users() TO authenticated, service_role;

-- =====================================================
-- 6. INITIALIZATION: Set up demo users
-- =====================================================

-- Ensure demo users have correct roles
SELECT public.ensure_demo_users();

-- Final verification
DO $$
BEGIN
  RAISE LOG 'Database reset and restructure completed successfully';
  RAISE LOG 'All policies, functions, and triggers have been recreated';
  RAISE LOG 'Demo users have been initialized with correct roles';
END;
$$;