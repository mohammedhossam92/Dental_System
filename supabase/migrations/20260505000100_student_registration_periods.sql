/*
  # Student registration periods

  1. Changes
    - Add nullable `registration_start_date` to students.
    - Create `student_registration_periods` to keep historical registration windows.

  2. Security
    - Enable RLS and isolate periods by organization.
*/

ALTER TABLE students
ADD COLUMN IF NOT EXISTS registration_start_date timestamptz;

CREATE TABLE IF NOT EXISTS student_registration_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_registration_periods_student_id
  ON student_registration_periods(student_id);

CREATE INDEX IF NOT EXISTS idx_student_registration_periods_organization_id
  ON student_registration_periods(organization_id);

ALTER TABLE student_registration_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_isolation_student_registration_periods" ON student_registration_periods;
CREATE POLICY "organization_isolation_student_registration_periods"
  ON student_registration_periods
  FOR ALL
  TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE OR REPLACE FUNCTION update_student_registration_periods_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_student_registration_periods_updated_at ON student_registration_periods;
CREATE TRIGGER set_student_registration_periods_updated_at
  BEFORE UPDATE ON student_registration_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_student_registration_periods_updated_at();
