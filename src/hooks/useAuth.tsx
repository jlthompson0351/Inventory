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
    }, 15000); // Reduced to 15 seconds

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
    
    // Add overall timeout to prevent infinite hanging - reduced timeout
    const timeoutId = setTimeout(() => {
      console.error('fetchUserData taking too long, forcing completion');
      isFetchingUserData.current = false;
      setLoading(false);
    }, 10000); // Reduced to 10 seconds for faster completion
    
    try {
      console.log('Starting optimized user data fetch...');
      
      // Use the new optimized function to get all data in one call
      console.log('Calling optimized get_user_profile_with_org function...');
      try {
        const { data: userData, error: userDataError } = await Promise.race([
          supabase.rpc('get_user_profile_with_org'),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('User data query timeout')), 8000)
          )
        ]);

        if (userDataError) {
          console.error('Error fetching user data:', userDataError);
          throw userDataError;
        }

        console.log('User data fetched successfully:', userData);

        // Parse the returned data
        if (userData) {
          // Set profile
          if (userData.profile) {
            console.log('Setting profile data');
            setProfile(userData.profile);
          } else {
            console.log('No profile data, setting default');
            setProfile({ full_name: 'User', avatar_url: null });
          }

          // Set organization
          if (userData.organization) {
            console.log('Setting organization data');
            const orgWithDefaults = {
              ...userData.organization,
              owner_id: null
            };
            setOrganization(orgWithDefaults as FullOrganizationType);
          } else {
            console.log('No organization data');
            setOrganization(null);
          }

          // Set membership
          if (userData.membership) {
            console.log('Setting membership data');
            setMembership(userData.membership);
          } else {
            console.log('No membership data');
            setMembership(null);
          }

          // Set platform operator status
          console.log('Setting platform operator status:', userData.is_platform_operator);
          setIsPlatformOperatorState(userData.is_platform_operator || false);
        } else {
          console.log('No user data returned, setting defaults');
          setProfile({ full_name: 'User', avatar_url: null });
          setOrganization(null);
          setMembership(null);
          setIsPlatformOperatorState(false);
        }

      } catch (error) {
        console.error('Optimized fetch failed, falling back to individual queries:', error);
        
        // Fallback to individual queries if the optimized function fails
        console.log('Executing fallback individual queries...');
        
        // Simplified fallback - just get basic profile data
        try {
          const { data: profileData, error: profileError } = await Promise.race([
            supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', currentUser.id)
              .single(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Profile query timeout')), 5000)
            )
          ]);

          if (profileError) {
            console.warn('Profile fetch failed:', profileError);
            setProfile({ full_name: 'User', avatar_url: null });
          } else {
            setProfile(profileData || { full_name: 'User', avatar_url: null });
          }
        } catch (fallbackError) {
          console.error('Fallback profile fetch failed:', fallbackError);
          setProfile({ full_name: 'User', avatar_url: null });
        }

        // Set safe defaults for organization data
        setOrganization(null);
        setMembership(null);
        setIsPlatformOperatorState(false);
      }

      console.log('User data fetch completed successfully');
      
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