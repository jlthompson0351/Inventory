import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const SetupMothership = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const setupMothership = async () => {
    setIsLoading(true);
    try {
      if (!user) {
        toast.error('You need to be logged in to setup Mothership');
        return;
      }

      // Check if Mothership org exists
      const { data: existingOrg, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', 'Mothership')
        .single();

      let mothershipId = existingOrg?.id;

      // Create Mothership org if it doesn't exist
      if (!mothershipId) {
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert([
            {
              name: 'Mothership',
              description: 'System administration organization',
              is_system: true
            }
          ])
          .select('id')
          .single();

        if (createError) {
          toast.error('Failed to create Mothership organization');
          return;
        }
        mothershipId = newOrg.id;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', mothershipId)
        .eq('user_id', user.id)
        .single();

      // Add user as member if not already
      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert([
            {
              organization_id: mothershipId,
              user_id: user.id,
              role: 'admin'
            }
          ]);

        if (memberError) {
          toast.error('Failed to add you as a member');
          return;
        }
      }

      // Ensure user has super_admin role
      const { error: roleError } = await supabase
        .from('system_roles')
        .upsert([
          {
            user_id: user.id,
            role: 'super_admin'
          }
        ]);

      if (roleError) {
        toast.error('Failed to set super admin role');
        return;
      }

      toast.success('Mothership setup complete!');
      // Refresh the page to reload organizations
      window.location.reload();
      
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={setupMothership} 
      disabled={isLoading || !user}
      variant="outline"
      className="w-full"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Setting up Mothership...
        </>
      ) : (
        'Quick Fix: Setup Mothership'
      )}
    </Button>
  );
}; 