/*
  # Fix RLS policies for treatments table

  1. Security Changes
    - Enable RLS on treatments table
    - Drop existing RLS policy
    - Create new comprehensive policy for all operations
*/

-- First enable RLS on the table (in case it wasn't enabled)
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON treatments;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON treatments;

-- Create new comprehensive policy
CREATE POLICY "Enable all operations for authenticated users" ON treatments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);