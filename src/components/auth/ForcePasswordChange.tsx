import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { usePasswordRequirement } from '@/hooks/usePasswordRequirement';
import { Lock, AlertTriangle } from 'lucide-react';

export function ForcePasswordChange() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const { markPasswordChanged } = usePasswordRequirement();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsChanging(true);
    try {
      // Update password in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Mark password as changed in our system
      const success = await markPasswordChanged();
      if (success) {
        toast.success('Password changed successfully! Please log in again with your new password.');
        
        // Sign out user and redirect to login
        await supabase.auth.signOut();
        
        // Small delay to ensure signOut completes, then reload
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      } else {
        toast.error('Password updated but system error occurred. Please refresh the page.');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(`Failed to change password: ${(error as Error).message}`);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Password Change Required</CardTitle>
          <CardDescription>
            You must change your temporary password before continuing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 6 characters long
              </p>
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isChanging || !newPassword || !confirmPassword}
            >
              <Lock className="mr-2 h-4 w-4" />
              {isChanging ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Security Note:</strong> Choose a strong password that you haven't used elsewhere. 
              You'll use this password for all future logins.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 