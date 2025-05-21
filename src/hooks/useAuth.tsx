import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

type Organization = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type OrganizationMember = {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_primary: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  organization: Organization | null;
  signOut: () => Promise<void>;
  userRoles: {
    isSystemAdmin: boolean;
    isSuperAdmin: boolean;
    isOrgAdmin: boolean;
  };
};

const defaultContext: AuthContextType = {
  user: null,
  loading: true,
  organization: null,
  signOut: async () => {},
  userRoles: {
    isSystemAdmin: false,
    isSuperAdmin: false,
    isOrgAdmin: false
  }
};

const AuthContext = createContext<AuthContextType>(defaultContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMember[]>([]);
  const [systemRoles, setSystemRoles] = useState<string[]>([]);

  // Calculate user roles based on data
  const userRoles = {
    isSystemAdmin: systemRoles.includes('admin'),
    isSuperAdmin: systemRoles.includes('super_admin'),
    isOrgAdmin: memberships.some(m => 
      m.organization_id === organization?.id && 
      (m.role === 'admin' || m.role === 'owner')
    )
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserData(session.user);
      } else {
        setOrganization(null);
        setMemberships([]);
        setSystemRoles([]);
      }
      
      setLoading(false);
    });

    // Initial auth check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserData(session.user);
      }
      
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (user: User) => {
    try {
      // Fetch organizations the user is a member of
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id);
      
      if (membershipError) {
        console.error('Error fetching memberships:', membershipError);
        return;
      }
      
      setMemberships(memberships || []);
      
      if (memberships && memberships.length > 0) {
        const orgIds = memberships.map(m => m.organization_id);
        
        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds);
        
        if (orgsError) {
          console.error('Error fetching organizations:', orgsError);
          return;
        }
        
        // Find primary organization or use the first one
        let selectedOrg = null;
        
        // First try to find a primary organization
        const primaryMembership = memberships.find(m => m.is_primary);
        if (primaryMembership && orgs) {
          selectedOrg = orgs.find(org => org.id === primaryMembership.organization_id);
        }
        
        // If no primary found, use the first one
        if (!selectedOrg && orgs && orgs.length > 0) {
          selectedOrg = orgs[0];
        }
        
        setOrganization(selectedOrg);
        console.log('Selected organization:', selectedOrg?.name);
      }
      
      // Fetch system roles
      const { data: roles, error: rolesError } = await supabase
        .from('system_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (rolesError) {
        console.error('Error fetching system roles:', rolesError);
        return;
      }
      
      setSystemRoles(roles?.map(r => r.role) || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    setMemberships([]);
    setSystemRoles([]);
  };

  const value = {
    user,
    loading,
    organization,
    signOut,
    userRoles
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default useAuth; 