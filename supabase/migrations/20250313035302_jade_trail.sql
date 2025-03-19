/*
  # Fix RLS policies for treatments table

  1. Security Changes
    - Drop existing RLS policy for treatments table
    - Create new RLS policy that properly handles all operations (SELECT, INSERT, UPDATE, DELETE)
    - Ensure authenticated users have full access to treatments table
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON treatments;

-- Create new comprehensive policy
CREATE POLICY "Enable all operations for authenticated users" ON treatments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);