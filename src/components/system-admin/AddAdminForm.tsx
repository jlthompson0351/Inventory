import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus } from 'lucide-react';

interface AddAdminFormProps {
  onAdminAdded?: () => void;
  isSuperAdmin?: boolean;
}

export default function AddAdminForm({ onAdminAdded, isSuperAdmin = false }: AddAdminFormProps) {
  const [email, setEmail] = useState('');
  const [isSuperAdminRole, setIsSuperAdminRole] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // First check if the user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError) {
        toast.error('User not found with this email');
        return;
      }

      // Add the user to system_roles table
      const { error: roleError } = await supabase
        .from('system_roles')
        .insert([
          {
            user_id: userData.id,
            role: isSuperAdminRole ? 'super_admin' : 'admin',
            assigned_by: (await supabase.auth.getUser()).data.user?.id
          }
        ]);

      if (roleError) throw roleError;

      toast.success('Admin role assigned successfully');
      setEmail('');
      setIsSuperAdminRole(false);
      onAdminAdded?.();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to assign admin role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add New Admin
        </CardTitle>
        <CardDescription>
          Assign admin privileges to an existing user
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              The user must have an existing account
            </p>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Super Admin</Label>
                <p className="text-sm text-muted-foreground">
                  Grant super admin privileges
                </p>
              </div>
              <Switch
                checked={isSuperAdminRole}
                onCheckedChange={setIsSuperAdminRole}
              />
            </div>
          )}

          <Button type="submit" disabled={isSubmitting || !email}>
            {isSubmitting ? 'Adding...' : 'Add Admin'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
