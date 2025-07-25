/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { validateAdminAuth, createServiceClient } from '../_shared/auth.ts';

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'member' | 'viewer';
  organizationId?: string; // Optional - will use admin's org if not provided
}

interface CreateUserResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
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
    const body: CreateUserRequest = await req.json();
    const { email, password, fullName, role } = body;
    const organizationId = body.organizationId || auth.organizationId;

    // Validate required fields
    if (!email || !password || !fullName || !role || !organizationId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, password, fullName, role' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate role
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid role. Must be admin, member, or viewer' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📝 Creating user: ${email} with role: ${role}`);

    // Create service client with full permissions
    const serviceSupabase = createServiceClient();

    // Check if user already exists
    const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers();
    const userExists = existingUsers.users.some(user => user.email === email);
    
    if (userExists) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `User with email ${email} already exists` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create user in auth
    console.log('👤 Creating user in auth...');
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        created_by_admin: 'true' // Triggers password change requirement
      }
    });

    if (authError) {
      console.error('❌ Auth creation failed:', authError);
      throw authError;
    }
    
    if (!authData.user) {
      throw new Error('Failed to create user - no user data returned');
    }

    console.log('✅ User created in auth:', authData.user.id);

    // Add user to organization
    console.log('🏢 Adding user to organization...');
    const { error: memberError } = await serviceSupabase
      .from('organization_members')
      .insert({
        user_id: authData.user.id,
        organization_id: organizationId,
        role: role,
        is_primary: false
      });

    if (memberError) {
      console.error('❌ Organization membership failed:', memberError);
      // Try to clean up - delete the auth user if org membership failed
      await serviceSupabase.auth.admin.deleteUser(authData.user.id);
      throw memberError;
    }

    console.log('✅ User added to organization');

    // Return success response
    const response: CreateUserResponse = {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        fullName: fullName,
        role: role
      }
    };

    console.log('🎉 User creation completed successfully');

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Error creating user:', error);
    
    const response: CreateUserResponse = {
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

curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/admin-create-user' \
  --header 'Authorization: Bearer YOUR_USER_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "test@example.com",
    "password": "temppassword123",
    "fullName": "Test User",
    "role": "member"
  }'

*/ 