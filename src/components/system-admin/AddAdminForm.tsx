
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddAdminFormProps {
  onAdminAdded: () => void;
}

const AddAdminForm: React.FC<AddAdminFormProps> = ({ onAdminAdded }) => {
  const [userEmail, setUserEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // First get the user_id from the email
      const { data: userData } = await supabase
        .rpc('get_user_id_by_email', { email_input: userEmail.trim() });
      
      if (!userData || userData.length === 0) {
        toast.error('User not found with that email');
        setIsSubmitting(false);
        return;
      }
      
      const foundUserId = userData[0].user_id;
      
      // Check if the user is already an admin
      const { data: existingRole } = await supabase
        .from('system_roles')
        .select('id')
        .eq('user_id', foundUserId);
      
      if (existingRole && existingRole.length > 0) {
        toast.error('This user is already a system admin');
        setIsSubmitting(false);
        return;
      }
      
      // Add the user as a system admin
      const { error: insertError } = await supabase
        .from('system_roles')
        .insert({
          user_id: foundUserId,
          role: 'admin'
        });
      
      if (insertError) {
        toast.error('Failed to add system admin');
        console.error('Error adding admin:', insertError);
      } else {
        toast.success(`${userEmail} has been added as a system admin`);
        setUserEmail('');
        onAdminAdded();
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          System Administrators
        </CardTitle>
        <CardDescription>
          Manage users with system-wide administrative privileges
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddAdmin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-email">Add New System Admin</Label>
            <div className="flex gap-2">
              <Input 
                id="user-email"
                placeholder="Enter user email" 
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Admin'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddAdminForm;
