/*
  # Enhance Organization Data Isolation

  1. Security Changes
    - Drop existing RLS policies
    - Create new, stricter RLS policies for all tables
    - Add organization_id validation to all tables
    - Ensure proper data isolation between organizations

  2. Changes
    - Update RLS policies to use auth.jwt() claims for organization_id
    - Add organization_id validation triggers
    - Ensure all tables have proper organization_id constraints
    - Handle existing NULL values in organization_id columns
*/

-- First, ensure we have at least one organization
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
    INSERT INTO organizations (name, invite_code)
    VALUES ('Default Organization', 'DEFAULT_ORG_CODE');
  END IF;
END $$;

-- Get the first organization's ID to use as default
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM organizations ORDER BY created_at ASC LIMIT 1;

  -- Update NULL organization_ids to use the default organization
  UPDATE students SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE patients SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE treatments SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE tooth_classes SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE working_days SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE class_years SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE treatment_visits SET organization_id = default_org_id WHERE organization_id IS NULL;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can only access their organization's students" ON students;
DROP POLICY IF EXISTS "Users can only access their organization's patients" ON patients;
DROP POLICY IF EXISTS "Users can only access their organization's treatments" ON treatments;
DROP POLICY IF EXISTS "Users can only access their organization's tooth classes" ON tooth_classes;
DROP POLICY IF EXISTS "Users can only access their organization's working days" ON working_days;
DROP POLICY IF EXISTS "Users can only access their organization's class years" ON class_years;
DROP POLICY IF EXISTS "Users can only access their organization's treatment visits" ON treatment_visits;

-- Now we can safely add NOT NULL constraints
ALTER TABLE students ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE patients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE treatments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE tooth_classes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE working_days ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE class_years ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE treatment_visits ALTER COLUMN organization_id SET NOT NULL;

-- Create new, stricter RLS policies for students
CREATE POLICY "organization_isolation_students" ON students
FOR ALL TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
)
WITH CHECK (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
);

-- Create new RLS policies for patients
CREATE POLICY "organization_isolation_patients" ON patients
FOR ALL TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
)
WITH CHECK (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
);

-- Create new RLS policies for treatments
CREATE POLICY "organization_isolation_treatments" ON treatments
FOR ALL TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
)
WITH CHECK (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
);

-- Create new RLS policies for tooth classes
CREATE POLICY "organization_isolation_tooth_classes" ON tooth_classes
FOR ALL TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
)
WITH CHECK (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
);

-- Create new RLS policies for working days
CREATE POLICY "organization_isolation_working_days" ON working_days
FOR ALL TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
)
WITH CHECK (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
);

-- Create new RLS policies for class years
CREATE POLICY "organization_isolation_class_years" ON class_years
FOR ALL TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
)
WITH CHECK (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
);

-- Create new RLS policies for treatment visits
CREATE POLICY "organization_isolation_treatment_visits" ON treatment_visits
FOR ALL TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
)
WITH CHECK (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND auth.jwt() ->> 'organization_id' IS NOT NULL
);

-- Update the set_organization_id function to be more strict
CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.jwt() ->> 'organization_id' IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;
  
  NEW.organization_id := (auth.jwt() ->> 'organization_id')::uuid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add foreign key constraints where missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_organization_id_fkey') THEN
    ALTER TABLE students
    ADD CONSTRAINT students_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_organization_id_fkey') THEN
    ALTER TABLE patients
    ADD CONSTRAINT patients_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatments_organization_id_fkey') THEN
    ALTER TABLE treatments
    ADD CONSTRAINT treatments_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tooth_classes_organization_id_fkey') THEN
    ALTER TABLE tooth_classes
    ADD CONSTRAINT tooth_classes_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'working_days_organization_id_fkey') THEN
    ALTER TABLE working_days
    ADD CONSTRAINT working_days_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_years_organization_id_fkey') THEN
    ALTER TABLE class_years
    ADD CONSTRAINT class_years_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_visits_organization_id_fkey') THEN
    ALTER TABLE treatment_visits
    ADD CONSTRAINT treatment_visits_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Add composite unique constraints to prevent duplicate data across organizations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatments_name_org_unique') THEN
    ALTER TABLE treatments 
    ADD CONSTRAINT treatments_name_org_unique 
    UNIQUE (name, organization_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tooth_classes_name_org_unique') THEN
    ALTER TABLE tooth_classes 
    ADD CONSTRAINT tooth_classes_name_org_unique 
    UNIQUE (name, organization_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'working_days_name_org_unique') THEN
    ALTER TABLE working_days 
    ADD CONSTRAINT working_days_name_org_unique 
    UNIQUE (name, organization_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_years_year_range_org_unique') THEN
    ALTER TABLE class_years 
    ADD CONSTRAINT class_years_year_range_org_unique 
    UNIQUE (year_range, organization_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_ticket_number_org_unique') THEN
    ALTER TABLE patients 
    ADD CONSTRAINT patients_ticket_number_org_unique 
    UNIQUE (ticket_number, organization_id);
  END IF;
END $$;