-- Create organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  invite_code text NOT NULL UNIQUE,
  allowed_domain text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create organization_members table for explicit membership tracking
CREATE TABLE organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_visits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Organizations policies
CREATE POLICY "Organizations are viewable by authenticated users"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Organization members policies
CREATE POLICY "Members are viewable within organization"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage organization members"
  ON organization_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
      AND organization_id = organization_members.organization_id
      AND role = 'admin'
    )
  );

-- Patients policies
CREATE POLICY "Users can only access their organization's patients"
  ON patients FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Students policies
CREATE POLICY "Users can only access their organization's students"
  ON students FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Create function to validate organization access
CREATE OR REPLACE FUNCTION validate_organization_access(
  p_email text,
  p_organization_id uuid,
  p_invite_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org organizations;
  v_result jsonb;
BEGIN
  -- Get organization details
  SELECT * INTO v_org
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Organization not found'
    );
  END IF;

  -- Check invite code if provided
  IF p_invite_code IS NOT NULL AND p_invite_code != '' THEN
    IF v_org.invite_code = p_invite_code THEN
      RETURN jsonb_build_object(
        'valid', true,
        'message', 'Valid invite code',
        'role', 'employee'
      );
    END IF;
  END IF;

  -- Check email domain if allowed_domain is set
  IF v_org.allowed_domain IS NOT NULL
     AND p_email LIKE '%@' || v_org.allowed_domain THEN
    RETURN jsonb_build_object(
      'valid', true,
      'message', 'Valid email domain',
      'role', 'employee'
    );
  END IF;

  -- Access denied
  RETURN jsonb_build_object(
    'valid', false,
    'message', CASE
      WHEN v_org.allowed_domain IS NOT NULL
        THEN 'Invalid invite code or email domain. Organization accepts emails from @' || v_org.allowed_domain
      ELSE 'Invalid invite code. Organization requires an invitation to join.'
    END
  );
END;
$$;

-- Create function to add user to organization
CREATE OR REPLACE FUNCTION add_user_to_organization(
  p_user_id uuid,
  p_organization_id uuid,
  p_role text DEFAULT 'employee'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert organization member record
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (p_user_id, p_organization_id, p_role);

  -- Update user's metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{organization_id}',
    to_jsonb(p_organization_id::text)
  )
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION validate_organization_access TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_to_organization TO authenticated;
