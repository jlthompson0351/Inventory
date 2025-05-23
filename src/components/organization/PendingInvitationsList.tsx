import React from 'react';
import { Mail, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PendingInvitation } from '@/types/invitation';

interface PendingInvitationsListProps {
  invitations: PendingInvitation[];
  onDelete: (invitationId: string) => void;
  onResend: (invitationId: string) => void;
  onRefresh: () => void;
}

const PendingInvitationsList = ({ invitations, onDelete, onResend, onRefresh }: PendingInvitationsListProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pending Invitations</CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            No pending invitations
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited as {invitation.role} • Expires in {
                        Math.ceil((new Date(invitation.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      } days
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onResend(invitation.id)}
                    title="Resend Invitation"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onDelete(invitation.id)}
                    title="Delete Invitation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingInvitationsList;
