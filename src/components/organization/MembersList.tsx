import React, { useState, useMemo } from 'react';
import { User, Trash2, CalendarDays, UserMinus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { OrganizationMember } from '@/types/organization';
import { format } from 'date-fns';

interface MembersListProps {
  members: OrganizationMember[];
  isLoading: boolean;
  onRoleChange: (memberId: string, role: string) => void;
  onRemoveMember: (memberId: string) => void;
  onDeleteUser?: (userId: string) => void;
}

const MembersList = ({ members, isLoading, onRoleChange, onRemoveMember, onDeleteUser }: MembersListProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    return members.filter(member =>
      (member.full_name && member.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [members, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Members List */}
      <div>
        {isLoading ? (
          <div className="py-4 text-center">Loading members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            {searchTerm ? 'No members match your search.' : 'No members found'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/20 border border-border rounded-lg gap-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4 flex-grow">
                  <div className="bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 border">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold text-base">
                      {member.full_name || "Unnamed User"}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    {member.joined_at && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Joined: {format(new Date(member.joined_at), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <Select 
                    defaultValue={member.role} 
                    onValueChange={(value) => onRoleChange(member.id, value)}
                  >
                    <SelectTrigger className="w-28">
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
                    title="Remove Member from Organization"
                    className="h-9 w-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  {onDeleteUser && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          title="Delete User Permanently"
                          className="h-9 w-9"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete User Permanently?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>
                              You are about to permanently delete <strong>{member.full_name || member.email}</strong> from the system.
                            </p>
                            <Alert variant="destructive" className="mt-3">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Warning</AlertTitle>
                              <AlertDescription>
                                This action cannot be undone. The user and all their associated data will be permanently removed from the system.
                              </AlertDescription>
                            </Alert>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteUser(member.user_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete User Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersList;
