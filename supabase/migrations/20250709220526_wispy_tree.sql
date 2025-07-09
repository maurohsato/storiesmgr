/*
  # Fix user signup database configuration

  1. Database Setup
    - Create required enums (user_role, project_status, story_status)
    - Create all necessary tables with proper structure
    - Set up foreign key relationships

  2. Authentication Functions
    - handle_new_user function to create profiles automatically
    - update_updated_at_column function for timestamp management
    - Proper triggers for user creation and updates

  3. Security
    - Enable RLS on all tables
    - Create comprehensive policies for all user roles
    - Grant necessary permissions to service roles

  4. Performance
    - Add indexes for frequently queried columns
    - Optimize for common query patterns
*/

-- Drop existing objects if they exist to ensure clean setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_user_stories_updated_at ON public.user_stories;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', ''),
    'reader'::user_role,
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure user_role enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'project_manager', 'collaborator', 'reader');
  END IF;
END $$;

-- Ensure project_status enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'paused');
  END IF;
END $$;

-- Ensure story_status enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'story_status') THEN
    CREATE TYPE story_status AS ENUM ('draft', 'ready', 'in-progress', 'in-review', 'done');
  END IF;
END $$;

-- Ensure the profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role user_role NOT NULL DEFAULT 'reader'::user_role,
  avatar_url text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Ensure other required tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  members text[] DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text DEFAULT '',
  collaborators jsonb DEFAULT '[]',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  duration text NOT NULL,
  technologies text[] DEFAULT '{}',
  status project_status DEFAULT 'planning'::project_status,
  start_date date NOT NULL,
  end_date date,
  internal_notes text DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_stories (
  id text PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  date date NOT NULL,
  author text NOT NULL,
  user_persona text NOT NULL,
  user_role text NOT NULL,
  user_constraints text DEFAULT '',
  user_desire text NOT NULL,
  user_importance text NOT NULL,
  current_problem text NOT NULL,
  main_steps text NOT NULL,
  alternative_flows text DEFAULT '',
  business_rules text DEFAULT '',
  validations text DEFAULT '',
  acceptance_criteria text NOT NULL,
  dependencies text DEFAULT '',
  technical_risks text DEFAULT '',
  requires_spike text DEFAULT '',
  additional_comments text DEFAULT '',
  status story_status DEFAULT 'draft'::story_status,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_project_id ON public.user_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_created_by ON public.user_stories(created_by);
CREATE INDEX IF NOT EXISTS idx_user_stories_status ON public.user_stories(status);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  -- Profiles policies
  DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  
  -- Teams policies
  DROP POLICY IF EXISTS "All authenticated users can read teams" ON public.teams;
  DROP POLICY IF EXISTS "Project managers and admins can manage teams" ON public.teams;
  
  -- Clients policies
  DROP POLICY IF EXISTS "All authenticated users can read clients" ON public.clients;
  DROP POLICY IF EXISTS "Project managers and admins can manage clients" ON public.clients;
  
  -- Projects policies
  DROP POLICY IF EXISTS "All authenticated users can read projects" ON public.projects;
  DROP POLICY IF EXISTS "Project managers and admins can manage projects" ON public.projects;
  
  -- User stories policies
  DROP POLICY IF EXISTS "All authenticated users can read user stories" ON public.user_stories;
  DROP POLICY IF EXISTS "Collaborators can create user stories" ON public.user_stories;
  DROP POLICY IF EXISTS "Users can update own user stories or managers can update all" ON public.user_stories;
  DROP POLICY IF EXISTS "Admins and project managers can delete user stories" ON public.user_stories;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Ignore if policies don't exist
END $$;

-- Create RLS policies for profiles
CREATE POLICY "Users can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

-- Allow service role to insert profiles (needed for the trigger)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to insert their own profile (backup policy)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create RLS policies for teams
CREATE POLICY "All authenticated users can read teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project managers and admins can manage teams"
  ON public.teams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- Create RLS policies for clients
CREATE POLICY "All authenticated users can read clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project managers and admins can manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- Create RLS policies for projects
CREATE POLICY "All authenticated users can read projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project managers and admins can manage projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- Create RLS policies for user stories
CREATE POLICY "All authenticated users can read user stories"
  ON public.user_stories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Collaborators can create user stories"
  ON public.user_stories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])
    )
  );

CREATE POLICY "Users can update own user stories or managers can update all"
  ON public.user_stories
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

CREATE POLICY "Admins and project managers can delete user stories"
  ON public.user_stories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role])
    )
  );

-- Create trigger for automatic profile creation on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for updating updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_stories_updated_at
  BEFORE UPDATE ON public.user_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure the service role can execute the functions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;