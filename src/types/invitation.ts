
// Custom types for organization invitations
export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by: string;
  expires_at: string;
  accepted_at?: string | null;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

export interface InvitationWithOrgName extends Invitation {
  organizationName: string;
}
