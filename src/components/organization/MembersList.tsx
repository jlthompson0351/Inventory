
import React from 'react';
import { User, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Member } from '@/hooks/useOrganizationMembers';

interface MembersListProps {
  members: Member[];
  isLoading: boolean;
  onUpdateRole: (memberId: string, role: string) => void;
  onRemoveMember: (memberId: string, isPrimary: boolean) => void;
}

const MembersList = ({ members, isLoading, onUpdateRole, onRemoveMember }: MembersListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>Manage your organization's members</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-4 text-center">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            No members found
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <div className="bg-muted h-10 w-10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.full_name || "Unnamed User"}
                      {member.is_primary && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                          Primary
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select 
                    defaultValue={member.role} 
                    disabled={member.is_primary}
                    onValueChange={(value) => onUpdateRole(member.id, value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    disabled={member.is_primary}
                    onClick={() => onRemoveMember(member.id, member.is_primary)}
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

export default MembersList;
