-- Create waiting_list table
CREATE TABLE IF NOT EXISTS waiting_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  patient_phone text NOT NULL,
  city text NOT NULL,
  diagnosis text NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

-- Create policy for organization-level isolation
DROP POLICY IF EXISTS "organization_isolation_waiting_list" ON waiting_list;
CREATE POLICY "organization_isolation_waiting_list"
  ON waiting_list
  FOR ALL
  TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Create index for organization isolation performance
CREATE INDEX IF NOT EXISTS idx_waiting_list_organization_id ON waiting_list(organization_id);
