export interface OrganizationMember {
  id: string; // Usually the user_id in the context of organization_members table
  user_id: string; // The actual user UUID
  email: string;
  full_name?: string | null;
  role: string; // e.g., 'admin', 'member', 'viewer'
  avatar_url?: string | null;
  joined_at: string; // ISO date string
  // Activity tracking fields
  last_sign_in_at?: string | null; // Last login timestamp from auth.users
  created_at?: string | null; // Account creation timestamp
  recent_activity_count?: number; // Count of activities in last 30 days
  session_count?: number; // Number of active/recent sessions
  // Add any other relevant fields, e.g., status, last_active_at
}

export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  owner_id?: string | null; // Made optional since it doesn't exist in database
  created_at: string;
  updated_at: string;
  // any other fields relevant to an organization
} 