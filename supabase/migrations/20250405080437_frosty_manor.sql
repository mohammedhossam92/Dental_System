/*
  # Fix Organization Data Isolation

  1. Changes
    - Add default organization if none exists
    - Update NULL organization_ids to use default organization
    - Add NOT NULL constraints to organization_id columns
    - Add foreign key constraints
    - Add composite unique constraints
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

-- Now we can safely add NOT NULL constraints
ALTER TABLE students ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE patients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE treatments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE tooth_classes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE working_days ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE class_years ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE treatment_visits ALTER COLUMN organization_id SET NOT NULL;

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