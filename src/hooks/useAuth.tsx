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
    }, 15000); // Increase to 15 seconds

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
    
    // Add overall timeout to prevent infinite hanging
    const timeoutId = setTimeout(() => {
      console.error('fetchUserData taking too long, forcing completion');
      isFetchingUserData.current = false;
      setLoading(false);
    }, 20000); // 20 second safety timeout
    
    try {
      console.log('Starting individual database queries...');
      
      // Test Supabase connectivity first
      console.log('Testing Supabase connectivity...');
      try {
        const connectTest = await Promise.race([
          supabase.from('organizations').select('count', { count: 'exact', head: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connectivity test timeout')), 5000))
        ]);
        console.log('Supabase connectivity test result:', connectTest);
        
        // Additional check: verify the connection returned expected data structure
        if (!connectTest || typeof (connectTest as any)?.count !== 'number') {
          console.warn('Connectivity test returned unexpected result, but continuing...');
        }
      } catch (connectError) {
        console.error('Supabase connectivity test failed:', connectError);
        
        // Try a fallback connectivity test using auth status
        console.log('Attempting fallback connectivity test...');
        try {
          const authTest = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth test timeout')), 3000))
          ]);
          console.log('Fallback auth test succeeded, continuing with normal flow');
        } catch (fallbackError) {
          console.error('Fallback connectivity test also failed:', fallbackError);
          console.log('Continuing with fallback mode - app will work without user data');
          
          // Set minimal fallback data to allow app to function
          setProfile({ full_name: 'User', avatar_url: null });
          setIsPlatformOperatorState(false);
          setOrganization(null);
          setMembership(null);
          
          console.log('Fallback mode activated - app should be functional');
          return;
        }
      }
      
      // Try sequential queries to identify which one hangs
      console.log('1. Fetching profile data...');
      try {
        const profileResult = await Promise.race([
          supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', currentUser.id)
            .single(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Profile query timeout')), 8000))
        ]);

        const { data: profileData, error: profileError } = profileResult;
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setProfile(null);
        } else {
          console.log('Profile data fetched successfully');
          setProfile(profileData ? { 
            full_name: profileData.full_name, 
            avatar_url: profileData.avatar_url 
          } : null);
        }
      } catch (error) {
        console.error('Profile fetch failed:', error);
        setProfile({ full_name: 'User', avatar_url: null }); // Fallback
      }

      console.log('2. Checking platform operator status...');
      try {
        const operatorResult = await Promise.race([
          supabase
            .from('platform_operators')
            .select('user_id')
            .eq('user_id', currentUser.id)
            .maybeSingle(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Operator query timeout')), 8000))
        ]);

        const { data: operatorData, error: operatorError } = operatorResult;
        if (operatorError) {
          console.error('Error checking platform operator status:', operatorError);
          setIsPlatformOperatorState(false);
        } else {
          console.log('Platform operator check completed');
          setIsPlatformOperatorState(!!operatorData);
        }
      } catch (error) {
        console.error('Operator check failed:', error);
        setIsPlatformOperatorState(false); // Safe fallback
      }

      console.log('3. Getting organization ID...');
      try {
        const orgIdResult = await Promise.race([
          supabase.rpc('get_current_organization_id'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('OrgID query timeout')), 8000))
        ]);

        const { data: orgId, error: orgIdError } = orgIdResult;
        
        if (orgIdError || !orgId) {
          console.log('No organization ID found for user');
          setOrganization(null);
          setMembership(null);
          return;
        }

        console.log('Organization ID found:', orgId, 'fetching org details...');

        // Fetch organization and membership data sequentially
        console.log('4. Fetching organization details...');
        try {
          const orgResult = await Promise.race([
            supabase
              .from('organizations')
              .select('*')
              .eq('id', orgId)
              .single(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Org details timeout')), 8000))
          ]);

          const { data: org, error: orgError } = orgResult;
          if (orgError) {
            console.error('Error fetching organization details:', orgError);
            setOrganization(null);
          } else {
            console.log('Organization details fetched successfully');
            const orgWithDefaults = {
              ...org,
              owner_id: null
            };
            setOrganization(orgWithDefaults as FullOrganizationType);
          }
        } catch (error) {
          console.error('Organization fetch failed:', error);
          setOrganization(null);
        }

        console.log('5. Fetching membership details...');
        try {
          const membershipResult = await Promise.race([
            supabase
              .from('organization_members')
              .select('*')
              .eq('user_id', currentUser.id)
              .eq('organization_id', orgId)
              .single(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Membership timeout')), 8000))
          ]);

          const { data: memberRec, error: membershipError } = membershipResult;
          if (membershipError) {
            console.error('Error fetching membership:', membershipError);
            setMembership(null);
          } else {
            console.log('Membership details fetched successfully');
            setMembership(memberRec || null);
          }
        } catch (error) {
          console.error('Membership fetch failed:', error);
          setMembership(null);
        }

        console.log('Organization and membership queries completed');

      } catch (error) {
        console.error('Organization ID fetch failed:', error);
        setOrganization(null);
        setMembership(null);
      }

      console.log('All individual queries completed, processing results...');
      
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