-- Drop the existing function first
DROP FUNCTION IF EXISTS validate_invite_code(p_email text, p_invite_code text);

-- Create the updated function with the new signature
CREATE OR REPLACE FUNCTION validate_invite_code(
  p_email text,
  p_invite_code text,
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id uuid;
  v_allowed_domain text;
BEGIN
  -- Get organization details
  SELECT id, allowed_domain
  INTO v_organization_id, v_allowed_domain
  FROM organizations
  WHERE id = p_organization_id;

  -- If organization doesn't exist, return false
  IF v_organization_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check invite code if provided
  IF p_invite_code IS NOT NULL AND p_invite_code != '' THEN
    IF EXISTS (
      SELECT 1
      FROM organizations
      WHERE id = p_organization_id
      AND invite_code = p_invite_code
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Check email domain if allowed_domain is set
  IF v_allowed_domain IS NOT NULL AND p_email LIKE '%@' || v_allowed_domain THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
