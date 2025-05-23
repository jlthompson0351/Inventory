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
  organizations: Organization[];
  currentOrganization: Organization | null;
  setCurrentOrganization: (org: Organization) => void;
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
  organizations: [],
  currentOrganization: null,
  setCurrentOrganization: () => {},
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMember[]>([]);
  const [systemRoles, setSystemRoles] = useState<string[]>([]);

  // Calculate user roles based on data
  const userRoles = {
    isSystemAdmin: systemRoles.includes('admin'),
    isSuperAdmin: systemRoles.includes('super_admin'),
    isOrgAdmin: memberships.some(m => 
      m.organization_id === currentOrganization?.id && 
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
        setOrganizations([]);
        setCurrentOrganization(null);
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

  // When organizations change, set the current organization to the first one if not already set
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      // Find the primary organization if available
      const primaryMembership = memberships.find(m => m.is_primary);
      if (primaryMembership) {
        const primaryOrg = organizations.find(org => org.id === primaryMembership.organization_id);
        if (primaryOrg) {
          setCurrentOrganization(primaryOrg);
          return;
        }
      }
      
      // Default to the first organization
      setCurrentOrganization(organizations[0]);
    }
  }, [organizations, currentOrganization, memberships]);

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
        
        setOrganizations(orgs || []);
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
    setOrganizations([]);
    setCurrentOrganization(null);
    setMemberships([]);
    setSystemRoles([]);
  };

  const value = {
    user,
    loading,
    organizations,
    currentOrganization,
    setCurrentOrganization,
    signOut,
    userRoles
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default useAuth; 