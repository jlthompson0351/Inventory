# Webmaster Setup Guide

This guide explains how to set up and use the platform operator (webmaster) system in your inventory management app.

## What This System Provides

The webmaster system allows you (as the platform owner) to:

1. **Create new organizations** for different companies/departments
2. **Assign administrators** to each organization  
3. **Manage users and permissions** across all organizations
4. **Monitor platform-wide activity** and statistics
5. **Switch between organizations** for management purposes

## Setup Instructions

### Step 1: Run the Database Migration

First, apply the new migration that adds platform operator functionality:

```bash
# Make sure you're in your project directory
cd /path/to/your/project

# Apply the migration to your Supabase database
# You can do this through the Supabase dashboard SQL editor or CLI
```

Copy and run this SQL in your Supabase SQL editor:

```sql
-- Run the contents of: supabase/migrations/20250105_platform_admin_enhancements.sql
```

### Step 2: Make Yourself a Platform Operator

1. Find your user ID in Supabase:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```

2. Add yourself as a platform operator:
   ```sql
   INSERT INTO platform_operators (user_id) 
   VALUES ('YOUR_USER_ID_HERE')
   ON CONFLICT (user_id) DO NOTHING;
   ```

3. Verify it worked:
   ```sql
   SELECT po.user_id, au.email 
   FROM platform_operators po 
   JOIN auth.users au ON po.user_id = au.id 
   WHERE au.email = 'your-email@example.com';
   ```

### Step 3: Access the Platform Dashboard

1. **Log out and log back in** to refresh your authentication state
2. Look for **"Platform Dashboard"** in your user menu (top-right corner)
3. Click it to access the enhanced platform management interface

## Using the Platform Dashboard

### Creating Organizations

1. Go to **Platform Dashboard** → **Create Organization**
2. Fill in:
   - **Organization Name** (required)
   - **Description** (optional)
   - **Admin Email** (optional - if provided, that user will be invited as admin)

3. Click **Create Organization**

### Managing Organizations

For each organization, you can:

1. **View member counts** and basic statistics
2. **Click "Manage"** to open detailed management
3. **View all members** with their roles and join dates
4. **Add new users** by email with specific roles
5. **Remove users** from organizations
6. **View pending invitations**

### User Management Workflow

#### Adding Users to Organizations

1. **Method 1: During Organization Creation**
   - Provide an admin email when creating the organization
   - That user will receive an invitation to join as admin

2. **Method 2: After Organization Creation**
   - Go to Platform Dashboard
   - Click "Manage" on the organization
   - Click "Add User" 
   - Enter their email and select role (member, admin, owner)

#### User Role Hierarchy

- **Owner**: Full organization control, can manage all settings
- **Admin**: Can manage users, assets, forms, and most organization settings  
- **Member**: Basic user access to view and use the system

### Important Notes

1. **Single Organization Model**: Each user can only belong to one organization at a time
2. **Platform Operator Privileges**: As a platform operator, you can create organizations but must be added as a member to manage them day-to-day
3. **Invitation System**: If you add a user by email who doesn't exist yet, they'll receive an invitation

## Best Practices

### For Setting Up New Organizations

1. **Create the organization** with a descriptive name
2. **Immediately add an admin** by email during creation
3. **Verify the admin received their invitation**
4. **Let the admin manage their own team** from that point forward

### For Managing Multiple Organizations

1. **Use descriptive organization names** (e.g., "Acme Corp Inventory", "Department of Transportation")
2. **Document organization purposes** in the description field
3. **Regularly review member lists** for security
4. **Monitor pending invitations** and clean up expired ones

## Troubleshooting

### "Access Denied" Message
- Ensure you've been added to the `platform_operators` table
- Log out and log back in to refresh your session
- Check that the migration was applied successfully

### Can't See Platform Dashboard Menu
- Verify you're logged in with the correct email
- Check the `platform_operators` table contains your user ID
- Clear browser cache and try again

### Organization Creation Fails
- Check Supabase logs for specific error messages
- Ensure all required database functions exist
- Verify your platform operator permissions

### User Can't Accept Invitation
- Check that the invitation hasn't expired (30 days by default)
- Verify the user isn't already in another organization
- Ensure they're using the exact email address that was invited

## Advanced Usage

### Adding Multiple Platform Operators

To add other users as platform operators:

```sql
-- Replace with their actual user ID
INSERT INTO platform_operators (user_id) 
VALUES ('OTHER_USER_ID_HERE')
ON CONFLICT (user_id) DO NOTHING;
```

### Monitoring Platform Activity

Use the enhanced dashboard to:
- Track organization growth
- Monitor user adoption
- Identify inactive organizations
- Review invitation success rates

### Custom Organization Setup

For complex setups, you can:
1. Create organizations programmatically via the RPC functions
2. Bulk add users via database scripts
3. Set up automated invitation workflows
4. Integrate with external user management systems

## Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Review Supabase logs for database errors
3. Verify all migrations have been applied
4. Ensure RLS (Row Level Security) policies are working correctly

The platform operator system is designed to scale with your business needs while maintaining security and user isolation between organizations. 