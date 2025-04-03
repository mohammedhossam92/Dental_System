/*
  # Multi-tenant Authentication System Setup

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `invite_code` (text, unique)
      - `allowed_domain` (text, optional)
      - `created_at` (timestamp)

  2. Changes to Existing Tables
    - Add `organization_id` to all relevant tables
    - Update RLS policies to enforce organization-based access

  3. Security
    - Enable RLS on organizations table
    - Add policies for organization-based access control
    - Create functions for invite code validation
*/

-- Create organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  invite_code text NOT NULL UNIQUE,
  allowed_domain text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read organizations
CREATE POLICY "Organizations are viewable by authenticated users"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update/delete organizations
CREATE POLICY "Only admins can modify organizations"
  ON organizations
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add organization_id to existing tables
ALTER TABLE students ADD COLUMN organization_id uuid REFERENCES organizations(id);
ALTER TABLE patients ADD COLUMN organization_id uuid REFERENCES organizations(id);
ALTER TABLE treatments ADD COLUMN organization_id uuid REFERENCES organizations(id);
ALTER TABLE tooth_classes ADD COLUMN organization_id uuid REFERENCES organizations(id);
ALTER TABLE working_days ADD COLUMN organization_id uuid REFERENCES organizations(id);
ALTER TABLE class_years ADD COLUMN organization_id uuid REFERENCES organizations(id);
ALTER TABLE treatment_visits ADD COLUMN organization_id uuid REFERENCES organizations(id);

-- Create function to validate invite codes and enforce organization rules
CREATE OR REPLACE FUNCTION validate_invite_code(
  p_email text,
  p_invite_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id uuid;
  v_allowed_domain text;
BEGIN
  -- First try to find organization by invite code
  SELECT id, allowed_domain INTO v_organization_id, v_allowed_domain
  FROM organizations
  WHERE invite_code = p_invite_code;

  -- If no invite code match, check allowed domain
  IF v_organization_id IS NULL THEN
    SELECT id, allowed_domain INTO v_organization_id, v_allowed_domain
    FROM organizations
    WHERE 
      allowed_domain IS NOT NULL 
      AND p_email LIKE '%@' || allowed_domain;
  END IF;

  -- If still no match, signup is not allowed
  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code or email domain';
  END IF;

  RETURN v_organization_id;
END;
$$;

-- Update RLS policies for all tables to enforce organization-based access

-- Students
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON students;
CREATE POLICY "Users can only access their organization's students"
  ON students
  FOR ALL
  TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Patients
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON patients;
CREATE POLICY "Users can only access their organization's patients"
  ON patients
  FOR ALL
  TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Treatments
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON treatments;
CREATE POLICY "Users can only access their organization's treatments"
  ON treatments
  FOR ALL
  TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Tooth Classes
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON tooth_classes;
CREATE POLICY "Users can only access their organization's tooth classes"
  ON tooth_classes
  FOR ALL
  TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Working Days
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON working_days;
CREATE POLICY "Users can only access their organization's working days"
  ON working_days
  FOR ALL
  TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Class Years
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON class_years;
CREATE POLICY "Users can only access their organization's class years"
  ON class_years
  FOR ALL
  TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Treatment Visits
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON treatment_visits;
CREATE POLICY "Users can only access their organization's treatment visits"
  ON treatment_visits
  FOR ALL
  TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Create trigger to automatically set organization_id on insert
CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.organization_id := (auth.jwt() ->> 'organization_id')::uuid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all tables
CREATE TRIGGER set_organization_id_students
  BEFORE INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_organization_id_patients
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_organization_id_treatments
  BEFORE INSERT ON treatments
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_organization_id_tooth_classes
  BEFORE INSERT ON tooth_classes
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_organization_id_working_days
  BEFORE INSERT ON working_days
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_organization_id_class_years
  BEFORE INSERT ON class_years
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_organization_id_treatment_visits
  BEFORE INSERT ON treatment_visits
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();