/*
  # Garantir que admin@demo.com seja sempre administrador

  1. Verificações
    - Verificar se o usuário admin@demo.com existe
    - Garantir que tenha role de admin
    - Criar perfil se não existir

  2. Segurança
    - Manter políticas RLS
    - Garantir acesso administrativo
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

-- Política especial para permitir que admins vejam todos os perfis
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Permitir que usuários vejam seu próprio perfil
    auth.uid() = id
    OR
    -- Permitir que admins vejam todos os perfis
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'::user_role
    )
  );

-- Política para permitir que admins atualizem qualquer perfil
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Usuários podem atualizar seu próprio perfil (exceto role)
    auth.uid() = id
    OR
    -- Admins podem atualizar qualquer perfil
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'::user_role
    )
  )
  WITH CHECK (
    -- Usuários podem atualizar seu próprio perfil (exceto role)
    (auth.uid() = id AND OLD.role = NEW.role)
    OR
    -- Admins podem atualizar qualquer perfil incluindo role
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'::user_role
    )
  );

-- Executar novamente para garantir
SELECT public.ensure_admin_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_admin_user() TO authenticated, service_role;