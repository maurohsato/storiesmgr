/*
  # Fix Admin User and Permissions

  1. Ensure admin@demo.com is always admin
  2. Create proper policies for profile management
  3. Update trigger function for new users
*/

-- Função para garantir que admin@demo.com seja sempre admin
CREATE OR REPLACE FUNCTION public.ensure_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  admin_exists boolean;
BEGIN
  -- Verificar se existe usuário admin@demo.com na tabela auth.users
  SELECT id INTO admin_user_id
  FROM auth.users 
  WHERE email = 'admin@demo.com'
  LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Verificar se o perfil existe
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE id = admin_user_id
    ) INTO admin_exists;
    
    IF admin_exists THEN
      -- Atualizar role para admin se não for
      UPDATE public.profiles 
      SET 
        role = 'admin'::user_role,
        updated_at = NOW()
      WHERE id = admin_user_id 
      AND role != 'admin'::user_role;
      
      RAISE LOG 'Admin user role updated for %', admin_user_id;
    ELSE
      -- Criar perfil admin se não existir
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

-- Executar a função para garantir admin
SELECT public.ensure_admin_user();

-- Atualizar função handle_new_user para garantir que admin@demo.com seja sempre admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Definir role baseado no email
  IF NEW.email = 'admin@demo.com' THEN
    user_role_value := 'admin'::user_role;
  ELSE
    user_role_value := 'reader'::user_role;
  END IF;

  -- Inserir ou atualizar perfil
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
    -- Log do erro mas não falha a criação do usuário
    RAISE LOG 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read basic profile info" ON public.profiles;

-- Create comprehensive policies for profiles
CREATE POLICY "Service role full access"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'::user_role
    )
  );

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile basic info"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'::user_role
    )
  );

-- Create helper functions for role checking that work with profiles table
CREATE OR REPLACE FUNCTION public.user_has_role(check_role user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = check_role
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_any_role(check_roles user_role[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = ANY(check_roles)
  );
$$;

-- Update other table policies to use the new helper functions
-- Teams policies
DROP POLICY IF EXISTS "Authorized users can read teams" ON public.teams;
DROP POLICY IF EXISTS "Project managers and admins can manage teams" ON public.teams;

CREATE POLICY "Authorized users can read teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Project managers and admins can manage teams"
  ON public.teams
  FOR ALL
  TO authenticated
  USING (public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]))
  WITH CHECK (public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]));

-- Clients policies
DROP POLICY IF EXISTS "Authorized users can read clients" ON public.clients;
DROP POLICY IF EXISTS "Project managers and admins can manage clients" ON public.clients;

CREATE POLICY "Authorized users can read clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Project managers and admins can manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]))
  WITH CHECK (public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]));

-- Projects policies
DROP POLICY IF EXISTS "Authorized users can read projects" ON public.projects;
DROP POLICY IF EXISTS "Project managers and admins can manage projects" ON public.projects;

CREATE POLICY "Authorized users can read projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Project managers and admins can manage projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]))
  WITH CHECK (public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]));

-- User Stories policies
DROP POLICY IF EXISTS "Authorized users can read user stories" ON public.user_stories;
DROP POLICY IF EXISTS "Collaborators can create user stories" ON public.user_stories;
DROP POLICY IF EXISTS "Users can update own user stories or managers can update all" ON public.user_stories;
DROP POLICY IF EXISTS "Admins and project managers can delete user stories" ON public.user_stories;

CREATE POLICY "Authorized users can read user stories"
  ON public.user_stories
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Collaborators can create user stories"
  ON public.user_stories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role]));

CREATE POLICY "Users can update own user stories or managers can update all"
  ON public.user_stories
  FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid() AND public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])) 
    OR public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role])
  )
  WITH CHECK (
    (created_by = auth.uid() AND public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])) 
    OR public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role])
  );

CREATE POLICY "Admins and project managers can delete user stories"
  ON public.user_stories
  FOR DELETE
  TO authenticated
  USING (public.user_has_any_role(ARRAY['admin'::user_role, 'project_manager'::user_role]));

-- Role Changes policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_changes' AND table_schema = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Only admins can read role changes" ON public.role_changes';
        EXECUTE 'CREATE POLICY "Only admins can read role changes" ON public.role_changes FOR SELECT TO authenticated USING (public.user_has_role(''admin''::user_role))';
    END IF;
END $$;

-- Executar novamente para garantir
SELECT public.ensure_admin_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_admin_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_role(user_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_any_role(user_role[]) TO authenticated, service_role;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);