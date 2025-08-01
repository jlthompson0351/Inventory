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
  
  // Use refs to track state and prevent multiple calls
  const isFetchingUserData = useRef(false);
  const isInitialized = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const pendingUserToFetch = useRef<User | null>(null);

  const organizationRole = membership?.role || null;

  const userRoles = {
    isOrgAdmin: !!(membership &&
      membership.organization_id === organization?.id && 
      (membership.role === 'admin' || membership.role === 'owner')
    ),
    isPlatformOperator: isPlatformOperatorState
  };

  // Separate function to fetch user data - NOT called inside onAuthStateChange
  const fetchUserData = async (currentUser: User) => {
    // fetchUserData started
    
    // Prevent multiple simultaneous calls
    if (isFetchingUserData.current) {
      // fetchUserData already in progress, skipping
      return;
    }
    
    isFetchingUserData.current = true;
    
    // Timeout for safety
    const timeoutId = setTimeout(() => {
              // fetchUserData taking too long, forcing completion
      isFetchingUserData.current = false;
      setLoading(false);
    }, 8000);
    
    try {
      // Starting user data fetch with direct queries
      
      // Execute queries sequentially to avoid issues
      try {
        // Get user profile
        // Fetching profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', currentUser.id)
          .single();

        if (profileError) {
          // Profile fetch failed
          setProfile({ full_name: 'User', avatar_url: null });
        } else {
          // Setting profile data
          setProfile(profileData as UserProfile);
        }
      } catch (error) {
        // Profile query failed
        setProfile({ full_name: 'User', avatar_url: null });
      }

      try {
        // Get user membership first
        // Fetching membership
        const { data: membershipData, error: membershipError } = await supabase
          .from('organization_members')
          .select('id, organization_id, role')
          .eq('user_id', currentUser.id)
          .eq('is_deleted', false)
          .single();

        if (membershipError) {
                      // Membership fetch failed
          setMembership(null);
          setOrganization(null);
        } else {
          // Setting membership data
          
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
              // Organization fetch failed
              setOrganization(null);
            } else {
              // Setting organization data
              const orgWithDefaults = {
                ...orgData,
                owner_id: null
              };
              setOrganization(orgWithDefaults as FullOrganizationType);
            }
          } catch (orgFetchError) {
            // Organization query failed
            setOrganization(null);
          }
        }
      } catch (error) {
        // Membership query failed
        setMembership(null);
        setOrganization(null);
      }

      try {
        // Check if user is platform operator
        // Checking platform operator status
        const { data: operatorData, error: operatorError } = await supabase
          .from('platform_operators')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .single();

        const isPlatformOperator = !operatorError && operatorData;
        // Setting platform operator status
        setIsPlatformOperatorState(!!isPlatformOperator);
      } catch (error) {
        // Platform operator query failed
        setIsPlatformOperatorState(false);
      }

      // Direct queries user data fetch completed successfully
      
    } catch (error) {
      // Error in fetchUserData (caught)
      // Set safe defaults on any error
      setProfile({ full_name: 'User', avatar_url: null });
      setOrganization(null);
      setMembership(null);
      setIsPlatformOperatorState(false);
    } finally {
      clearTimeout(timeoutId);
      isFetchingUserData.current = false;
      setLoading(false);
      // fetchUserData function ending
    }
  };

  // Effect to handle pending user data fetching
  useEffect(() => {
    if (pendingUserToFetch.current && !isFetchingUserData.current) {
      const userToFetch = pendingUserToFetch.current;
      pendingUserToFetch.current = null;
      fetchUserData(userToFetch);
    }
  }, [user]);

  useEffect(() => {
    // Auth provider initializing
    
    // Set a maximum loading timeout
    const loadingTimeout = setTimeout(() => {
              // Auth loading timeout reached, forcing completion
      setLoading(false);
    }, 10000);

    // THE FIX: NO async calls inside onAuthStateChange
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Auth state changed
      clearTimeout(loadingTimeout);
      
      const sessionUser = session?.user ?? null;
      const currentUserId = sessionUser?.id || null;
      
      setUser(sessionUser);
      
      if (sessionUser) {
        // Only schedule fetchUserData if:
        // 1. It's not an INITIAL_SESSION event (unless we haven't initialized yet)
        // 2. We're not already fetching
        // 3. The user ID has changed OR we haven't fetched for this user yet
        const shouldFetchData = (event !== 'INITIAL_SESSION' || !isInitialized.current) &&
          !isFetchingUserData.current &&
          (lastUserId.current !== currentUserId);
        
        if (shouldFetchData) {
          // Scheduling fetchUserData
          lastUserId.current = currentUserId;
          isInitialized.current = true;
          // Schedule the async call to happen OUTSIDE this handler
          pendingUserToFetch.current = sessionUser;
        } else {
          // Skipping fetchUserData
        }
      } else {
        // Clearing user state - no session user
        // Clear all user-related state
        setOrganization(null);
        setMembership(null);
        setProfile(null);
        setIsPlatformOperatorState(false);
        lastUserId.current = null;
        pendingUserToFetch.current = null;
      }
      
      setLoading(false);
    });

    // Initial auth check
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Session check failed
          clearTimeout(loadingTimeout);
          setLoading(false);
          return;
        }
        
        // Initial session check completed
        
        if (!session) {
          clearTimeout(loadingTimeout);
          setLoading(false);
        }
      } catch (error) {
        // Auth initialization failed
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    setMembership(null);
    setProfile(null);
    setIsPlatformOperatorState(false);
    pendingUserToFetch.current = null;
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