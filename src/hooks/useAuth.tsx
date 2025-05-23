import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import type { Organization as FullOrganizationType } from '@/types/organization';

// Remove or comment out the local, simplified Organization type
// type Organization = {
//   id: string;
//   name: string;
//   avatar_url: string | null;
// };

// Simplified organization member type
type OrganizationMember = {
  id: string;
  user_id: string;
  organization_id: string;
  role: string; // e.g., 'owner', 'admin', 'manager', 'member'
};

// Profile type to hold full_name and avatar_url
type UserProfile = {
  full_name: string | null;
  avatar_url: string | null;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  organization: FullOrganizationType | null;
  organizationRole: string | null;
  signOut: () => Promise<void>;
  userRoles: {
    isOrgAdmin: boolean;
    isPlatformOperator: boolean;
  };
  fetchUserData: (user: User) => Promise<void>;
};

const defaultContext: AuthContextType = {
  user: null,
  profile: null,
  loading: true,
  organization: null,
  organizationRole: null,
  signOut: async () => {},
  userRoles: {
    isOrgAdmin: false,
    isPlatformOperator: false
  },
  fetchUserData: async () => {}
};

const AuthContext = createContext<AuthContextType>(defaultContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<FullOrganizationType | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [isPlatformOperatorState, setIsPlatformOperatorState] = useState(false);

  const organizationRole = membership?.role || null;

  const userRoles = {
    isOrgAdmin: !!(membership &&
      membership.organization_id === organization?.id && 
      (membership.role === 'admin' || membership.role === 'owner')
    ),
    isPlatformOperator: isPlatformOperatorState
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      
      if (sessionUser) {
        await fetchUserData(sessionUser);
      } else {
        setOrganization(null);
        setMembership(null);
        setProfile(null);
        setIsPlatformOperatorState(false);
      }
      
      setLoading(false);
    });

    // Initial auth check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      
      if (sessionUser) {
        await fetchUserData(sessionUser);
      }
      
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (currentUser: User) => {
    try {
      // Fetch Profile Data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setProfile(null);
      } else {
        setProfile(profileData ? { full_name: profileData.full_name, avatar_url: profileData.avatar_url } : null);
      }

      // Check if user is a platform operator
      const { data: operatorData, error: operatorError } = await supabase
        .from('platform_operators')
        .select('user_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (operatorError) {
        console.error('Error checking platform operator status:', operatorError);
        setIsPlatformOperatorState(false);
      } else {
        setIsPlatformOperatorState(!!operatorData);
      }

      // Get the user's organization using our simplified function
      const { data: orgId, error: orgIdError } = await supabase.rpc('get_current_organization_id');
      
      if (orgIdError) {
        console.error('Error fetching user organization ID:', orgIdError);
        setOrganization(null);
        setMembership(null);
      } else if (orgId) {
        // Get organization details
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();
        
        if (orgError) {
          console.error('Error fetching organization details:', orgError);
          setOrganization(null);
          setMembership(null);
        } else {
          setOrganization(org as FullOrganizationType);
          
          // Get the user's membership
          const { data: memberRec, error: membershipError } = await supabase
            .from('organization_members')
            .select('*') // Fetch all fields including 'role'
            .eq('user_id', currentUser.id)
            .eq('organization_id', orgId)
            .single();
          
          if (membershipError) {
            console.error('Error fetching membership:', membershipError);
            setMembership(null);
          } else {
            setMembership(memberRec || null);
          }
        }
      } else {
        // If no orgId, ensure organization and membership are null
        setOrganization(null);
        setMembership(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setProfile(null);
      setOrganization(null);
      setMembership(null);
      setIsPlatformOperatorState(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    setMembership(null);
    setProfile(null);
    setIsPlatformOperatorState(false);
  };

  const value = {
    user,
    profile,
    loading,
    organization,
    organizationRole,
    signOut,
    userRoles,
    fetchUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default useAuth; 