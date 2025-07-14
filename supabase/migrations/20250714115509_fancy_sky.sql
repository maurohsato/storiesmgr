/*
  # Ensure demo profiles exist

  1. Create demo profiles if they don't exist
    - admin@demo.com (admin role)
    - manager@demo.com (project_manager role)
    - collab@demo.com (collaborator role)
    - reader@demo.com (reader role)

  2. Fix profile creation trigger
    - Ensure trigger creates profile automatically for new users
    - Handle edge cases where profile might not be created

  3. Add function to create missing profiles
    - Function to manually create profiles for existing users
*/

-- Function to create a profile for a user if it doesn't exist
CREATE OR REPLACE FUNCTION create_profile_if_missing(user_id uuid, user_email text, user_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (user_id, user_email, COALESCE(user_name, split_part(user_email, '@', 1)), 'reader')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Ensure demo profiles exist (these should match the auth.users table)
-- Note: These UUIDs should match the actual user IDs from auth.users
-- If they don't exist in auth.users, they won't work

-- Function to get or create demo profiles
CREATE OR REPLACE FUNCTION ensure_demo_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  manager_user_id uuid;
  collab_user_id uuid;
  reader_user_id uuid;
BEGIN
  -- Try to find existing users in auth.users
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@demo.com' LIMIT 1;
  SELECT id INTO manager_user_id FROM auth.users WHERE email = 'manager@demo.com' LIMIT 1;
  SELECT id INTO collab_user_id FROM auth.users WHERE email = 'collab@demo.com' LIMIT 1;
  SELECT id INTO reader_user_id FROM auth.users WHERE email = 'reader@demo.com' LIMIT 1;

  -- Create profiles for existing users
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (admin_user_id, 'admin@demo.com', 'Administrador Demo', 'admin')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  END IF;

  IF manager_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (manager_user_id, 'manager@demo.com', 'Gerente Demo', 'project_manager')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  END IF;

  IF collab_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (collab_user_id, 'collab@demo.com', 'Colaborador Demo', 'collaborator')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  END IF;

  IF reader_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (reader_user_id, 'reader@demo.com', 'Leitor Demo', 'reader')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  END IF;
END;
$$;

-- Execute the function to ensure demo profiles exist
SELECT ensure_demo_profiles();

-- Improved trigger function for new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role user_role;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'admin@demo.com' THEN
    user_role := 'admin';
  ELSIF NEW.email = 'manager@demo.com' THEN
    user_role := 'project_manager';
  ELSIF NEW.email = 'collab@demo.com' THEN
    user_role := 'collaborator';
  ELSIF NEW.email = 'reader@demo.com' THEN
    user_role := 'reader';
  ELSE
    user_role := 'reader'; -- Default role for new users
  END IF;

  -- Create profile
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to fix missing profiles for existing users
CREATE OR REPLACE FUNCTION fix_missing_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  user_role user_role;
BEGIN
  -- Find users without profiles
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Determine role based on email
    IF user_record.email = 'admin@demo.com' THEN
      user_role := 'admin';
    ELSIF user_record.email = 'manager@demo.com' THEN
      user_role := 'project_manager';
    ELSIF user_record.email = 'collab@demo.com' THEN
      user_role := 'collaborator';
    ELSIF user_record.email = 'reader@demo.com' THEN
      user_role := 'reader';
    ELSE
      user_role := 'reader';
    END IF;

    -- Create missing profile
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'full_name', split_part(user_record.email, '@', 1)),
      user_role
    );
    
    RAISE NOTICE 'Created profile for user: %', user_record.email;
  END LOOP;
END;
$$;

-- Execute the function to fix any missing profiles
SELECT fix_missing_profiles();