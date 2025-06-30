import React, { useState, useEffect, useContext, createContext, ReactNode, useRef } from 'react';
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
  
  // Use useRef to prevent multiple simultaneous calls and track initialization
  const isFetchingUserData = useRef(false);
  const isInitialized = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const organizationRole = membership?.role || null;

  const userRoles = {
    isOrgAdmin: !!(membership &&
      membership.organization_id === organization?.id && 
      (membership.role === 'admin' || membership.role === 'owner')
    ),
    isPlatformOperator: isPlatformOperatorState
  };

  useEffect(() => {
    console.log('Auth provider initializing... Build:', new Date().toISOString());
    
    // Set a maximum loading timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth loading timeout reached, forcing completion');
      setLoading(false);
    }, 12000); // Reduced to 12 seconds for faster response

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, 'Session exists:', !!session, 'Initialized:', isInitialized.current);
      clearTimeout(loadingTimeout);
      
      const sessionUser = session?.user ?? null;
      const currentUserId = sessionUser?.id || null;
      
      setUser(sessionUser);
      
      // Only fetch data if:
      // 1. User exists
      // 2. It's not an INITIAL_SESSION event (unless we haven't initialized yet)
      // 3. We're not already fetching
      // 4. The user ID has changed OR we haven't fetched for this user yet
      const shouldFetchData = sessionUser && 
        (event !== 'INITIAL_SESSION' || !isInitialized.current) &&
        !isFetchingUserData.current &&
        (lastUserId.current !== currentUserId);
      
      if (shouldFetchData) {
        console.log('Triggering fetchUserData for event:', event, 'userId:', currentUserId);
        try {
          await fetchUserData(sessionUser);
          lastUserId.current = currentUserId;
          isInitialized.current = true;
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else if (!sessionUser) {
        console.log('Clearing user state - no session user');
        // Clear all user-related state
        setOrganization(null);
        setMembership(null);
        setProfile(null);
        setIsPlatformOperatorState(false);
        lastUserId.current = null;
      } else {
        console.log('Skipping fetchUserData - shouldFetchData:', shouldFetchData, 'reasons:', {
          hasUser: !!sessionUser,
          eventType: event,
          isInitialized: isInitialized.current,
          isFetching: isFetchingUserData.current,
          userIdChanged: lastUserId.current !== currentUserId
        });
      }
      
      setLoading(false);
    });

    // Initial auth check - but don't fetch data here, let the auth state change handle it
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check failed:', error);
          clearTimeout(loadingTimeout);
          setLoading(false);
          return;
        }
        
        // Don't fetch data here - let the auth state change listener handle it
        console.log('Initial session check completed, session exists:', !!session);
        
        // If no session exists after initial check, ensure loading is false
        if (!session) {
          clearTimeout(loadingTimeout);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      clearTimeout(loadingTimeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (currentUser: User) => {
    console.log('fetchUserData started for user:', currentUser.id, 'isFetching:', isFetchingUserData.current);
    
    // Prevent multiple simultaneous calls
    if (isFetchingUserData.current) {
      console.log('fetchUserData already in progress, skipping...');
      return;
    }
    
    isFetchingUserData.current = true;
    
    // Reduced timeout to prevent infinite hanging
    const timeoutId = setTimeout(() => {
      console.error('fetchUserData taking too long, forcing completion');
      isFetchingUserData.current = false;
      setLoading(false);
    }, 10000); // Increased timeout to allow for all queries
    
    try {
      console.log('Starting user data fetch with direct queries (no RPC)...');
      
      // Use ONLY direct database queries - RPC functions have auth context issues
      console.log('Executing direct database queries...');
      
      // Execute queries sequentially to avoid timeout issues
      try {
        // Get user profile
        console.log('Fetching profile...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', currentUser.id)
          .single();

        if (profileError) {
          console.warn('Profile fetch failed:', profileError);
          setProfile({ full_name: 'User', avatar_url: null });
        } else {
          console.log('Setting profile data:', profileData);
          setProfile(profileData as UserProfile);
        }
      } catch (error) {
        console.error('Profile query failed:', error);
        setProfile({ full_name: 'User', avatar_url: null });
      }

      try {
        // Get user membership first
        console.log('Fetching membership...');
        const { data: membershipData, error: membershipError } = await supabase
          .from('organization_members')
          .select('id, organization_id, role')
          .eq('user_id', currentUser.id)
          .eq('is_deleted', false)
          .single();

        if (membershipError) {
          console.warn('Membership fetch failed:', membershipError);
          setMembership(null);
          setOrganization(null);
        } else {
          console.log('Setting membership data:', membershipData);
          
          // Set membership
          setMembership({
            id: membershipData.id,
            user_id: currentUser.id,
            organization_id: membershipData.organization_id,
            role: membershipData.role
          });

          // Get organization data separately
          try {
            const { data: orgData, error: orgError } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', membershipData.organization_id)
              .single();

            if (orgError) {
              console.warn('Organization fetch failed:', orgError);
              setOrganization(null);
            } else {
              console.log('Setting organization data:', orgData);
              const orgWithDefaults = {
                ...orgData,
                owner_id: null
              };
              setOrganization(orgWithDefaults as FullOrganizationType);
            }
          } catch (orgFetchError) {
            console.error('Organization query failed:', orgFetchError);
            setOrganization(null);
          }
        }
      } catch (error) {
        console.error('Membership query failed:', error);
        setMembership(null);
        setOrganization(null);
      }

      try {
        // Check if user is platform operator
        console.log('Checking platform operator status...');
        const { data: operatorData, error: operatorError } = await supabase
          .from('platform_operators')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .single();

        const isPlatformOperator = !operatorError && operatorData;
        console.log('Setting platform operator status:', isPlatformOperator);
        setIsPlatformOperatorState(!!isPlatformOperator);
      } catch (error) {
        console.error('Platform operator query failed:', error);
        setIsPlatformOperatorState(false);
      }

      console.log('Direct queries user data fetch completed successfully');
      
    } catch (error) {
      console.error('Error in fetchUserData (caught):', error);
      // Set safe defaults on any error
      setProfile({ full_name: 'User', avatar_url: null });
      setOrganization(null);
      setMembership(null);
      setIsPlatformOperatorState(false);
    } finally {
      clearTimeout(timeoutId);
      isFetchingUserData.current = false;
      setLoading(false);
      console.log('fetchUserData function ending for user:', currentUser.id);
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

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      organization,
      organizationRole,
      signOut,
      userRoles,
      fetchUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default useAuth; 