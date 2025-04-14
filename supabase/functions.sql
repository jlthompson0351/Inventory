
-- Get invitation by token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(token_input TEXT)
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  email TEXT,
  role TEXT,
  invited_by UUID,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    i.id,
    i.organization_id,
    i.email,
    i.role,
    i.invited_by,
    i.expires_at,
    i.accepted_at
  FROM 
    public.organization_invitations i
  WHERE 
    i.token = token_input;
END;
$$;

-- Get all pending invitations for an organization
CREATE OR REPLACE FUNCTION public.get_organization_invitations(org_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    i.id,
    i.email,
    i.role,
    i.created_at,
    i.expires_at
  FROM 
    public.organization_invitations i
  WHERE 
    i.organization_id = org_id
    AND i.accepted_at IS NULL
    AND i.expires_at > now();
END;
$$;

-- Create invitation
CREATE OR REPLACE FUNCTION public.create_invitation(
  org_id UUID,
  email_address TEXT,
  member_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_invitation_id UUID;
  expiration_date TIMESTAMPTZ;
  token_value TEXT;
BEGIN
  -- Set expiration date (30 days from now)
  expiration_date := now() + interval '30 days';
  
  -- Generate random token
  token_value := encode(gen_random_bytes(24), 'hex');
  
  -- Create invitation
  INSERT INTO public.organization_invitations (
    organization_id,
    email,
    role,
    invited_by,
    token,
    expires_at
  ) VALUES (
    org_id,
    email_address,
    member_role,
    auth.uid(),
    token_value,
    expiration_date
  ) RETURNING id INTO new_invitation_id;
  
  RETURN new_invitation_id;
END;
$$;

-- Delete invitation
CREATE OR REPLACE FUNCTION public.delete_invitation(invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.organization_invitations
  WHERE id = invitation_id;
  
  RETURN FOUND;
END;
$$;

-- Accept invitation function (renamed from accept_organization_invitation to avoid conflicts)
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record public.organization_invitations;
  member_id UUID;
BEGIN
  -- Get the invitation if it exists, is not expired, and not already accepted
  SELECT * INTO invitation_record
  FROM public.organization_invitations
  WHERE token = invitation_token
  AND expires_at > now()
  AND accepted_at IS NULL;
  
  IF invitation_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Mark the invitation as accepted
  UPDATE public.organization_invitations
  SET accepted_at = now()
  WHERE id = invitation_record.id;
  
  -- Add the user to the organization
  INSERT INTO public.organization_members (user_id, organization_id, role, is_primary)
  VALUES (auth.uid(), invitation_record.organization_id, invitation_record.role, false)
  RETURNING id INTO member_id;
  
  RETURN member_id;
END;
$$;
