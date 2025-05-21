import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

// Simple organization type
type Organization = {
  id: string;
  name: string;
  avatar_url: string | null;
};

// Simplified organization member type
type OrganizationMember = {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
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
      // Get the user's organization using our simplified function
      const { data: orgId, error: orgIdError } = await supabase.rpc('get_current_organization_id');
      
      if (orgIdError) {
        console.error('Error fetching user organization ID:', orgIdError);
        return;
      }
      
      if (orgId) {
        // Get organization details
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();
        
        if (orgError) {
          console.error('Error fetching organization details:', orgError);
          return;
        }
        
        setOrganization(org);
        
        // Get the user's membership
        const { data: membership, error: membershipError } = await supabase
          .from('organization_members')
          .select('*')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .single();
        
        if (membershipError) {
          console.error('Error fetching membership:', membershipError);
          return;
        }
        
        setMemberships(membership ? [membership] : []);
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