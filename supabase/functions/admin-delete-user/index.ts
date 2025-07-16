/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { validateAdminAuth, createServiceClient } from '../_shared/auth.ts';

interface DeleteUserRequest {
  userId: string;
  organizationId?: string; // Optional - will use admin's org if not provided
}

interface DeleteUserResponse {
  success: boolean;
  message?: string;
  error?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS headers for browser requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    console.log('🔐 Validating admin authentication...');
    
    // Validate admin authentication
    const auth = await validateAdminAuth(req);
    if (!auth.isValid || !auth.isAdmin) {
      console.log('❌ Auth failed:', auth.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: auth.error || 'Unauthorized - Admin access required' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Admin authenticated:', auth.user.email);

    // Parse request body
    const body: DeleteUserRequest = await req.json();
    const { userId } = body;
    const organizationId = body.organizationId || auth.organizationId;

    // Validate required fields
    if (!userId || !organizationId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: userId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === auth.user.id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cannot delete your own admin account' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🗑️ Deleting user: ${userId}`);

    // Create service client with full permissions
    const serviceSupabase = createServiceClient();

    // First, check if user exists and is in the same organization
    const { data: membership, error: membershipError } = await serviceSupabase
      .from('organization_members')
      .select('user_id, role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_deleted', false)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found in your organization' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User found in organization');

    // Get user details before deletion for logging
    const { data: userDetails } = await serviceSupabase.auth.admin.getUserById(userId);
    const userEmail = userDetails.user?.email || 'unknown';

    // Remove user from organization first
    console.log('🏢 Removing user from organization...');
    const { error: removeError } = await serviceSupabase
      .from('organization_members')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    if (removeError) {
      console.error('❌ Failed to remove from organization:', removeError);
      throw removeError;
    }

    console.log('✅ User removed from organization');

    // Delete user from auth (this will cascade delete related data)
    console.log('👤 Deleting user from auth...');
    const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('❌ Auth deletion failed:', authDeleteError);
      // Try to re-add to organization if auth deletion failed
      await serviceSupabase
        .from('organization_members')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          role: membership.role,
          is_primary: false,
          is_deleted: false
        });
      throw authDeleteError;
    }

    console.log('✅ User deleted from auth');

    // Return success response
    const response: DeleteUserResponse = {
      success: true,
      message: `User ${userEmail} has been successfully deleted`
    };

    console.log('🎉 User deletion completed successfully');

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Error deleting user:', error);
    
    const response: DeleteUserResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/* To test this function locally:

curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/admin-delete-user' \
  --header 'Authorization: Bearer YOUR_USER_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "userId": "USER_ID_TO_DELETE"
  }'

*/ 