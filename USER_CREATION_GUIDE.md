# User Creation Guide for Platform Operators

This guide explains how to create users directly from the Platform Dashboard and manage them in your inventory management system.

## 🚨 **TODO: REVAMP USER ADDITION PROCESS**

**Current Status**: The invitation system creates database records but **doesn't actually send emails**. Users aren't receiving invitation emails.

**Need to implement**:
- Actual email service integration (SendGrid, Mailgun, etc.)
- Or switch to manual invitation link sharing
- Or use Supabase Auth's built-in invitation system

**Priority**: Medium - can be addressed after core functionality issues are resolved.

## Features Added

### 1. Create New Users
- **Generate temporary passwords** for new users
- **Create user accounts** with email and optional full name
- **Assign roles** (Member, Admin, Owner) during creation
- **Instructions provided** for completing user creation in Supabase

### 2. Batch Add Users
- **Add multiple users** at once by entering email addresses (one per line)
- **Existing users** are added directly to the organization
- **New email addresses** receive invitations to join
- **Single role assignment** for all users in the batch

### 3. Enhanced User Management
- **Three buttons** for different user addition methods:
  - "Add Existing" - Add users who already have accounts
  - "Create User" - Create new user accounts with temp passwords
  - "Batch Add" - Add multiple users at once

## How to Create Users

### Step 1: Access Platform Dashboard
1. Log in as a platform operator
2. Navigate to the Platform Dashboard from the user menu
3. Select an organization to manage

### Step 2: Create a New User
1. Click the **"Create User"** button
2. Fill in the form:
   - **Email**: The user's email address (required)
   - **Full Name**: Optional display name
   - **Temporary Password**: Click "Generate" for a secure password, or enter your own
   - **Role**: Choose Member, Admin, or Owner
3. Click **"Create User"**

### Step 3: Complete User Creation
Since direct user creation requires Supabase admin API access, you'll receive instructions to:

1. Go to your **Supabase Dashboard** > **Authentication** > **Users**
2. Click **"Add User"**
3. Enter the email and temporary password provided
4. The password will be copied to your clipboard automatically
5. After creating the user in Supabase, refresh the Platform Dashboard
6. The user will automatically be added to the organization

### Step 4: User First Login
When the user logs in for the first time:
1. They'll use the temporary password you created
2. They should be prompted to change their password
3. They'll have access to the organization with the role you assigned

## Batch User Creation

### Adding Multiple Users
1. Click **"Batch Add"** button
2. Enter email addresses, one per line:
   ```
   user1@company.com
   user2@company.com
   user3@company.com
   ```
3. Select the role for all users
4. Click **"Batch Add Users"**

The system will:
- **Add existing users** directly to the organization
- **Send invitations** to email addresses without accounts
- **Show a summary** of successful additions and any errors

## Security Features

### Role-Based Access
- **Platform Operators** only can create users
- **RLS policies** protect all user creation functions
- **Organization isolation** ensures users can only be added to appropriate orgs

### Password Security
- **Generated passwords** are 12 characters with mixed case, numbers, and symbols
- **Temporary passwords** should be changed on first login
- **No password storage** in the frontend (only displayed once)

## Database Functions Created

### `generate_temp_password()`
Generates secure 12-character temporary passwords.

### `create_multiple_invitations_as_platform_admin()`
Handles batch user addition with smart detection of existing vs. new users.

## Best Practices

1. **Always use generated passwords** for better security
2. **Communicate with users** about their temporary passwords securely
3. **Encourage password changes** on first login
4. **Use batch operations** for onboarding teams
5. **Review organization members** regularly

## Troubleshooting

### User Creation Issues
- **Permission denied**: Ensure you're logged in as a platform operator
- **Email already exists**: Use "Add Existing" instead of "Create User"
- **Invalid role**: Stick to Member, Admin, or Owner

### Batch Operation Issues
- **Mixed results**: Check the console for detailed error messages
- **Some emails failed**: Review the error list and try problematic emails individually

## Technical Notes

The user creation workflow is split between:
1. **Platform Dashboard** - Generates passwords and provides instructions
2. **Supabase Dashboard** - Creates the actual user account
3. **Automatic Assignment** - Users are added to organizations upon account creation

This approach maintains security while providing platform operators with the tools they need to onboard users efficiently. 