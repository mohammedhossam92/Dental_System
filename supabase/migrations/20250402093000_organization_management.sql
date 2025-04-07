-- Create organization_invites table
CREATE TABLE organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'employee',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz,
  UNIQUE(organization_id, email)
);

-- Enable RLS on organization_invites
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Create policies for organization_invites
CREATE POLICY "Organization admins can manage invites"
  ON organization_invites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
      AND auth.uid() IN (
        SELECT user_id FROM organization_members
        WHERE organization_id = o.id
        AND role = 'admin'
      )
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
  v_organization record;
  v_invite record;
  v_result jsonb;
BEGIN
  -- Get organization details
  SELECT * INTO v_organization
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Organization not found'
    );
  END IF;

  -- Check invite code if provided
  IF p_invite_code IS NOT NULL THEN
    SELECT * INTO v_invite
    FROM organization_invites
    WHERE organization_id = p_organization_id
    AND email = p_email
    AND invite_code = p_invite_code
    AND used_at IS NULL
    AND expires_at > now();

    IF FOUND THEN
      RETURN jsonb_build_object(
        'valid', true,
        'message', 'Valid invite code',
        'role', v_invite.role
      );
    END IF;
  END IF;

  -- Check email domain if allowed_domain is set
  IF v_organization.allowed_domain IS NOT NULL
  AND p_email LIKE '%@' || v_organization.allowed_domain THEN
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
      WHEN v_organization.allowed_domain IS NOT NULL THEN
        'Email domain must be @' || v_organization.allowed_domain
      ELSE
        'Organization access requires an invitation'
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
  -- Update user's metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{organization_id}',
    to_jsonb(p_organization_id::text)
  )
  WHERE id = p_user_id;

  -- Mark invite as used if exists
  UPDATE organization_invites
  SET used_at = now()
  WHERE organization_id = p_organization_id
  AND email = (
    SELECT email FROM auth.users WHERE id = p_user_id
  )
  AND used_at IS NULL;

  RETURN true;
END;
$$;
