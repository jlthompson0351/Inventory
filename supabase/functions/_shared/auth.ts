import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  isValid: boolean;
  isAdmin: boolean;
  user: any;
  organizationId?: string;
  error?: string;
}

export async function validateAdminAuth(req: Request): Promise<AuthResult> {
  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return { isValid: false, isAdmin: false, user: null, error: 'No authorization header' };
    }

    // Create client with user context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return { isValid: false, isAdmin: false, user: null, error: 'Invalid or expired token' };
    }

    // Check if user is admin in their organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .single();

    if (membershipError || !membership) {
      return { 
        isValid: true, 
        isAdmin: false, 
        user: userData.user, 
        error: 'User is not an admin' 
      };
    }

    return {
      isValid: true,
      isAdmin: true,
      user: userData.user,
      organizationId: membership.organization_id,
    };
  } catch (error) {
    return { 
      isValid: false, 
      isAdmin: false, 
      user: null, 
      error: `Auth validation failed: ${error.message}` 
    };
  }
}

export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

export function createUserClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );
} 