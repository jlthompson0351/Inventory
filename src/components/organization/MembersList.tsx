import React, { useState, useMemo } from 'react';
import { User, Trash2, CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { OrganizationMember } from '@/types/organization';
import { format } from 'date-fns';

interface MembersListProps {
  members: OrganizationMember[];
  isLoading: boolean;
  onRoleChange: (memberId: string, role: string) => void;
  onRemoveMember: (memberId: string) => void;
}

const MembersList = ({ members, isLoading, onRoleChange, onRemoveMember }: MembersListProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    return members.filter(member =>
      (member.full_name && member.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [members, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>Manage your organization's members</CardDescription>
          </div>
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-4 text-center">Loading members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            {searchTerm ? 'No members match your search.' : 'No members found'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md gap-3">
                <div className="flex items-center gap-3 flex-grow">
                  <div className="bg-muted h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium">
                      {member.full_name || "Unnamed User"}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    {member.joined_at && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Joined: {format(new Date(member.joined_at), 'PPP')}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <Select 
                    defaultValue={member.role} 
                    onValueChange={(value) => onRoleChange(member.id, value)}
                  >
                    <SelectTrigger className="w-28 sm:w-24">
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
                    onClick={() => onRemoveMember(member.id)}
                    title="Remove Member"
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
