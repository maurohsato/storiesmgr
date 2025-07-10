/*
  # Configuração de Administrador e Controle de Acesso

  1. Configurações
    - admin@demo.com automaticamente vira admin
    - Novos usuários são readers por padrão
    - Políticas restritivas para controle de acesso

  2. Segurança
    - RLS restritivo para todas as tabelas
    - Apenas usuários autorizados podem acessar dados
    - Sistema de auditoria para mudanças de roles

  3. Funcionalidades
    - Função para verificar admin principal
    - Trigger para criação automática de perfis
    - Auditoria de mudanças de roles
*/

-- Função para verificar se é o admin principal
CREATE OR REPLACE FUNCTION public.is_main_admin(user_email text)
RETURNS boolean AS $$
BEGIN
  RETURN user_email = 'admin@demo.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função handle_new_user para definir admin automaticamente
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
    -- Log do erro mas não falha a criação do usuário
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que admin@demo.com existe e tem role admin
DO $$
BEGIN
  -- Verificar se o perfil admin@demo.com existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = 'admin@demo.com') THEN
    -- Atualizar para garantir que é admin
    UPDATE public.profiles 
    SET role = 'admin'::user_role, updated_at = NOW()
    WHERE email = 'admin@demo.com' AND role != 'admin'::user_role;
  END IF;
END $$;

-- Drop políticas existentes para profiles
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic info" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can manage all profiles" ON public.profiles;

-- Políticas mais restritivas para profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own basic info"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Only admins can manage all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

-- Drop e recriar políticas para teams
DROP POLICY IF EXISTS "All authenticated users can read teams" ON public.teams;
DROP POLICY IF EXISTS "Project managers and admins can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Authorized users can read teams" ON public.teams;

CREATE POLICY "Authorized users can read teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])
    )
  );

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

-- Drop e recriar políticas para clients
DROP POLICY IF EXISTS "All authenticated users can read clients" ON public.clients;
DROP POLICY IF EXISTS "Project managers and admins can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Authorized users can read clients" ON public.clients;

CREATE POLICY "Authorized users can read clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])
    )
  );

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

-- Drop e recriar políticas para projects
DROP POLICY IF EXISTS "All authenticated users can read projects" ON public.projects;
DROP POLICY IF EXISTS "Project managers and admins can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Authorized users can read projects" ON public.projects;

CREATE POLICY "Authorized users can read projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])
    )
  );

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

-- Drop e recriar políticas para user_stories
DROP POLICY IF EXISTS "All authenticated users can read user stories" ON public.user_stories;
DROP POLICY IF EXISTS "Collaborators can create user stories" ON public.user_stories;
DROP POLICY IF EXISTS "Users can update own user stories or managers can update all" ON public.user_stories;
DROP POLICY IF EXISTS "Admins and project managers can delete user stories" ON public.user_stories;
DROP POLICY IF EXISTS "Authorized users can read user stories" ON public.user_stories;

CREATE POLICY "Authorized users can read user stories"
  ON public.user_stories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])
    )
  );

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
    (created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'collaborator'::user_role])
    )) OR
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

-- Criar tabela para auditoria de mudanças de role
CREATE TABLE IF NOT EXISTS public.role_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_role user_role,
  new_role user_role,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT NOW()
);

-- Enable RLS na tabela de auditoria
ALTER TABLE public.role_changes ENABLE ROW LEVEL SECURITY;

-- Drop política existente se existir
DROP POLICY IF EXISTS "Only admins can read role changes" ON public.role_changes;

-- Política para auditoria - apenas admins podem ver
CREATE POLICY "Only admins can read role changes"
  ON public.role_changes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

-- Função para registrar mudanças de role (corrigida)
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se é um UPDATE e se o role mudou
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
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

-- Drop trigger existente se existir
DROP TRIGGER IF EXISTS log_role_changes ON public.profiles;

-- Trigger para auditoria de mudanças de role
CREATE TRIGGER log_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_role_changes_user_id ON public.role_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_role_changes_changed_by ON public.role_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_role_changes_created_at ON public.role_changes(created_at);

-- Grant permissions para a nova tabela
GRANT ALL ON public.role_changes TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_role_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_main_admin(text) TO authenticated, service_role;