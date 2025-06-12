import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface InviteFormProps {
  email: string;
  setEmail: (email: string) => void;
  role: string;
  setRole: (role: string) => void;
  customMessage: string;
  setCustomMessage: (message: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const InviteForm = ({ email, setEmail, role, setRole, customMessage, setCustomMessage, isSubmitting, onSubmit }: InviteFormProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Invite New Members</h3>
        <p className="text-sm text-muted-foreground">Send invitations to join your organization</p>
      </div>
      
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="invite-email" className="text-sm font-medium">Email Address</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="invite-role" className="text-sm font-medium">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="invite-custom-message" className="text-sm font-medium">Custom Message (Optional)</Label>
          <Textarea
            id="invite-custom-message"
            placeholder="Add a personal message to the invitation..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
        
        <Button type="submit" className="w-full h-10" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Invitation"}
        </Button>
      </form>
    </div>
  );
};

export default InviteForm;
