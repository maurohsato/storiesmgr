/*
  # Sistema de Autenticação e Controle de Acesso

  1. Tabelas Principais
    - `profiles` - Perfis de usuário com roles
    - `teams` - Times/equipes
    - `clients` - Clientes
    - `projects` - Projetos
    - `user_stories` - Histórias de usuário

  2. Roles de Usuário
    - `admin` - Controle total + gestão de usuários
    - `project_manager` - CRUD completo exceto gestão de usuários
    - `collaborator` - Criar/editar próprias histórias
    - `reader` - Somente leitura

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas baseadas em roles
    - Auditoria de mudanças
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'project_manager', 'collaborator', 'reader');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'paused');
CREATE TYPE story_status AS ENUM ('draft', 'ready', 'in-progress', 'in-review', 'done');

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'reader',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  members TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  collaborators JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  duration TEXT NOT NULL,
  technologies TEXT[] DEFAULT '{}',
  status project_status DEFAULT 'planning',
  start_date DATE NOT NULL,
  end_date DATE,
  internal_notes TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Stories table
CREATE TABLE IF NOT EXISTS user_stories (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  author TEXT NOT NULL,
  user_persona TEXT NOT NULL,
  user_role TEXT NOT NULL,
  user_constraints TEXT DEFAULT '',
  user_desire TEXT NOT NULL,
  user_importance TEXT NOT NULL,
  current_problem TEXT NOT NULL,
  main_steps TEXT NOT NULL,
  alternative_flows TEXT DEFAULT '',
  business_rules TEXT DEFAULT '',
  validations TEXT DEFAULT '',
  acceptance_criteria TEXT NOT NULL,
  dependencies TEXT DEFAULT '',
  technical_risks TEXT DEFAULT '',
  requires_spike TEXT DEFAULT '',
  additional_comments TEXT DEFAULT '',
  status story_status DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teams policies
CREATE POLICY "All authenticated users can read teams" ON teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Project managers and admins can manage teams" ON teams
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
    )
  );

-- Clients policies
CREATE POLICY "All authenticated users can read clients" ON clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Project managers and admins can manage clients" ON clients
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
    )
  );

-- Projects policies
CREATE POLICY "All authenticated users can read projects" ON projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Project managers and admins can manage projects" ON projects
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
    )
  );

-- User Stories policies
CREATE POLICY "All authenticated users can read user stories" ON user_stories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Collaborators can create user stories" ON user_stories
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'project_manager', 'collaborator')
    )
  );

CREATE POLICY "Users can update own user stories or managers can update all" ON user_stories
  FOR UPDATE TO authenticated USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
    )
  );

CREATE POLICY "Admins and project managers can delete user stories" ON user_stories
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
    )
  );

-- Function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stories_updated_at BEFORE UPDATE ON user_stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_project_id ON user_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_status ON user_stories(status);
CREATE INDEX IF NOT EXISTS idx_user_stories_created_by ON user_stories(created_by);