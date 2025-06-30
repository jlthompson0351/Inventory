import React, { useState, useMemo } from 'react';
import { User, Trash2, CalendarDays, UserMinus, Clock, Activity, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { format, formatDistanceToNow, isAfter, subDays } from 'date-fns';

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

  const getActivityStatus = (member: OrganizationMember) => {
    if (!member.last_sign_in_at) {
      return { status: 'never', color: 'text-muted-foreground', badge: 'Never logged in' };
    }
    
    const lastLogin = new Date(member.last_sign_in_at);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince === 0) {
      return { status: 'today', color: 'text-green-600', badge: 'Active today' };
    } else if (daysSince <= 7) {
      return { status: 'recent', color: 'text-blue-600', badge: 'Active this week' };
    } else if (daysSince <= 30) {
      return { status: 'monthly', color: 'text-yellow-600', badge: 'Active this month' };
    } else {
      return { status: 'inactive', color: 'text-red-600', badge: 'Inactive' };
    }
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const getAccountAge = (createdAt: string | null) => {
    if (!createdAt) return 'Unknown';
    try {
      const created = new Date(createdAt);
      const days = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      if (days < 30) return `${days} days`;
      if (days < 365) return `${Math.floor(days / 30)} months`;
      return `${Math.floor(days / 365)} years`;
    } catch {
      return 'Unknown';
    }
  };

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
            {filteredMembers.map((member) => {
              const activityStatus = getActivityStatus(member);
              
              return (
                <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/20 border border-border rounded-lg gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-4 flex-grow">
                    <div className="bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 border">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-base">
                          {member.full_name || "Unnamed User"}
                        </p>
                        <Badge variant="outline" className={activityStatus.color}>
                          {activityStatus.badge}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{member.email}</p>
                      
                      {/* Activity Information */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {member.joined_at && (
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Joined: {format(new Date(member.joined_at), 'MMM dd, yyyy')}
                          </div>
                        )}
                        
                        {member.last_sign_in_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last seen: {formatLastSeen(member.last_sign_in_at)}
                          </div>
                        )}
                        
                        {member.created_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Account age: {getAccountAge(member.created_at)}
                          </div>
                        )}
                        
                        {typeof member.recent_activity_count === 'number' && member.recent_activity_count > 0 && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {member.recent_activity_count} actions (30d)
                          </div>
                        )}
                      </div>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersList;
