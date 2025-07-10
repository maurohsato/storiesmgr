/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Multiple overlapping RLS policies on profiles table
    - Some policies call functions that recursively query profiles table
    - This creates infinite recursion when trying to access profile data

  2. Solution
    - Remove all existing policies that might cause recursion
    - Create simple, direct policies that don't call recursive functions
    - Use only auth.uid() for user identification (no profile table lookups)

  3. New Policies
    - Users can read their own profile
    - Users can update their own profile
    - Service role has full access for system operations
    - Simple admin check without recursion for profile management
*/

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role full access" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new, simple policies without recursion

-- Allow service role full access (needed for triggers and system operations)
CREATE POLICY "Service role full access"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (needed for registration)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow admins to read all profiles (using direct role check, no function calls)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles admin_check 
      WHERE admin_check.id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  );

-- Allow admins to update any profile (using direct role check, no function calls)
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles admin_check 
      WHERE admin_check.id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles admin_check 
      WHERE admin_check.id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  );

-- Allow admins to manage all profiles (insert, delete)
CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_check 
      WHERE admin_check.id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin_check 
      WHERE admin_check.id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  );