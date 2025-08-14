# User Creation Guide for Platform Operators

This guide explains how to create users directly from the Platform Dashboard using the fully automated user creation system.

## 🎉 **System Status: FULLY AUTOMATED**

✅ **User creation is completely automated** - no manual Supabase steps required!  
✅ **Users can login immediately** with their temporary password  
✅ **Password change is enforced** on first login  
✅ **Organization membership is automatic**  

## Overview

The platform provides **two ways** to create users:

1. **Individual User Creation** - Create one user at a time with full control
2. **Organization Creation with Admin** - Create organization and admin user simultaneously

Both methods use the **`admin-create-user` Supabase Edge Function** for fully automated user creation.

## Prerequisites

### Platform Operator Access
You must be a **Platform Operator** to create users. To verify your access:

1. Log into the application
2. Check your user menu (top-right corner)  
3. You should see **"Platform Dashboard"** option

If you don't see this option, contact your system administrator to add you as a platform operator.

### Required Information
To create a user, you need:
- **Email address** (valid email format)
- **Temporary password** (can be generated automatically)
- **Role** (admin, member, or viewer)
- **Organization** to add them to

## Method 1: Individual User Creation

### Step 1: Access the Platform Dashboard
1. Click your profile in the top-right corner
2. Select **"Platform Dashboard"**
3. You'll see a list of all organizations

### Step 2: Select Organization
1. Find the organization you want to add users to
2. Click the **"Manage"** button for that organization
3. This opens the organization management interface

### Step 3: Create User
1. Click the **"Create User"** button
2. Fill out the user creation form:
   - **Email**: Enter the user's email address
   - **Temporary Password**: Click **"Generate"** for a secure password, or enter your own
   - **Role**: Select from:
     - **admin** - Can manage users, assets, forms, and organization settings
     - **member** - Standard user access to the system
     - **viewer** - Read-only access
3. Click **"Create User"**

### Step 4: User Creation Process
The system automatically:
1. ✅ **Creates the user account** in Supabase Auth
2. ✅ **Adds them to the organization** with the specified role
3. ✅ **Sets up password change requirement** for first login
4. ✅ **Shows success confirmation** with login details

### Step 5: Share Credentials
After successful creation, you'll see a confirmation like:
```
🎉 User created successfully!

Email: newuser@company.com
Organization: Acme Company
Role: member

They can now login and will be prompted to change their password.
```

**Share these credentials securely** with the new user.

## Method 2: Organization Creation with Admin

### When to Use This Method
- Setting up a new organization
- Need to create both organization and its first admin user
- Onboarding a new company/department

### Process
1. Go to **Platform Dashboard**
2. Click **"Create Organization"**
3. Fill out the organization form:
   - **Organization Name**: Required
   - **Description**: Optional
   - **Admin Email**: Enter the email of the person who will manage this organization
4. Click **"Create Organization"**

The system will:
1. ✅ Create the new organization
2. ✅ Create admin user account with temporary password
3. ✅ Add admin to the organization
4. ✅ Display the admin's login credentials

## User First Login Experience

### What Happens
1. User navigates to your application login page
2. Enters the email and temporary password you provided
3. **System forces password change** - they cannot skip this step
4. After changing password, they have full access based on their assigned role

### Password Requirements
The system enforces these password requirements:
- Minimum length and complexity (configured in Supabase)
- Must be different from temporary password
- Standard security practices

## User Roles Explained

### Admin
- **Full organization management** capabilities
- Can create, edit, and delete other users
- Manage assets, inventory, forms, and reports
- Access organization settings and configuration
- Can use Platform Dashboard features for their organization

### Member  
- **Standard user access** to all core features
- Create and manage assets and inventory
- Submit forms and view reports
- Cannot manage other users or organization settings

### Viewer
- **Read-only access** to the system
- Can view assets, inventory, and reports
- Cannot create, edit, or delete data
- Useful for stakeholders who need visibility without editing rights

## Technical Implementation

### Edge Function: `admin-create-user`
**Location**: `supabase/functions/admin-create-user/index.ts`

**What it does**:
- Validates the requesting user is an admin in their organization
- Creates user account in Supabase Auth with `email_confirm: true`
- Adds user metadata including `created_by_admin: 'true'`
- Adds user to organization_members table with specified role
- Handles cleanup if any step fails

**Security Features**:
- Admin authentication required
- Organization-scoped permissions
- Automatic rollback on failure
- Audit trail through system logs

### Database Functions
The system includes several supporting database functions:
- `generate_temp_password()` - Creates secure temporary passwords
- `create_user_for_platform_operator()` - Platform operator user creation
- `admin_create_user()` - Core user creation logic
- `mark_user_password_change_required()` - Forces password change

### Authentication Flow
1. **Platform Dashboard** gets user's session token
2. **Edge Function** validates admin permissions using session
3. **Service Role Key** used for Supabase Auth admin operations
4. **RLS policies** ensure proper organization isolation

## Troubleshooting

### Common Issues

**"Only platform operators can view all organizations"**
- You're not set up as a platform operator
- Contact system administrator to add platform operator role

**"User with email already exists"**
- The email address already has an account
- Use the "Add Existing User" feature instead
- Or check if they're already in the organization

**"Edge Function returned a non-2xx status code"**
- Network connectivity issue
- Supabase service availability problem
- Check browser console for detailed error message

**User can't login with temporary password**
- Verify you're giving them the correct password (case-sensitive)
- Ensure they're using the correct email address
- Check if password has special characters that might be copied incorrectly

### Debugging Steps
1. **Check browser console** for detailed error messages
2. **Verify organization selection** - ensure you're managing the correct org
3. **Test with simple password** - avoid special characters initially
4. **Check Supabase Auth users** - verify user was actually created
5. **Validate organization membership** - check organization_members table

## Best Practices

### Password Management
- **Always use the Generate button** for secure passwords
- **Avoid special characters** that might be difficult to type on mobile
- **Share passwords securely** - use encrypted messaging when possible
- **Remind users to change passwords** on first login

### Role Assignment
- **Start with 'member' role** - can be upgraded later if needed
- **Use 'admin' sparingly** - only for users who need to manage others
- **'viewer' role for stakeholders** - read-only access for reporting

### Organization Management
- **Create organization admin first** - let them manage their own team
- **Document the admin contact** - keep track of who manages each organization
- **Regular access reviews** - periodically verify user access is still needed

### Security
- **Monitor user creation** - keep track of who's creating accounts
- **Use strong temporary passwords** - the Generate function creates secure passwords
- **Force password changes** - never disable the password change requirement
- **Regular permission audits** - review organization memberships

## API Reference

### Edge Function Endpoint
```
POST /functions/v1/admin-create-user
```

**Headers**:
```
Authorization: Bearer <user_session_token>
Content-Type: application/json
apikey: <supabase_anon_key>
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "TempPass123",
  "fullName": "John Smith",
  "role": "member",
  "organizationId": "uuid-of-organization"
}
```

**Response** (Success):
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com", 
    "fullName": "John Smith",
    "role": "member"
  }
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "User with email user@example.com already exists"
}
```

This user creation system provides a secure, automated way to onboard users while maintaining proper access controls and audit trails. 