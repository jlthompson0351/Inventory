import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type DbResult<T> = {
  data: T | null;
  error: Error | null;
};

export function SetupMothership() {
  const [isLoading, setIsLoading] = useState(false);

  const setupMothership = async () => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Check if Mothership exists
      const { data: existingOrg, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('is_mothership', true)
        .single();

      if (orgError && orgError.code !== 'PGRST116') throw orgError;

      let mothershipId: string;

      if (!existingOrg) {
        // Create Mothership organization
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({
            name: 'Mothership',
            is_mothership: true,
            created_by: user.id
          })
          .select('id')
          .single();

        if (createError) throw createError;
        if (!newOrg) throw new Error('Failed to create Mothership organization');
        mothershipId = newOrg.id;
      } else {
        mothershipId = existingOrg.id;
      }

      // Check if user is already a member
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', mothershipId)
        .eq('user_id', user.id)
        .single();

      if (membershipError && membershipError.code !== 'PGRST116') throw membershipError;

      if (!membership) {
        // Add user as admin
        const { error: addMemberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: mothershipId,
            user_id: user.id,
            role: 'admin'
          });

        if (addMemberError) throw addMemberError;
      }

      // Ensure user has super_admin role
      const { error: roleError } = await supabase
        .from('system_roles')
        .upsert({
          user_id: user.id,
          role: 'super_admin'
        });

      if (roleError) throw roleError;

      toast.success('Mothership organization setup complete!');
      // Refresh page to reload organizations
      window.location.reload();
    } catch (error) {
      console.error('Error setting up Mothership:', error);
      toast.error('Failed to setup Mothership organization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={setupMothership}
      disabled={isLoading}
    >
      {isLoading ? 'Setting up...' : 'Quick Fix: Setup Mothership'}
    </Button>
  );
} 