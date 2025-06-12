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
    }, 25000); // Increased to 25 seconds to match improved connectivity timeouts

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
    }, 20000); // Reduced to 20 seconds for faster completion
    
    try {
      console.log('Starting individual database queries...');
      
      // Simplified connectivity test - just check if we can get the session
      // Skip the complex connectivity testing that's causing issues
      console.log('Testing basic connectivity...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('No session found during connectivity check');
        } else {
          console.log('Basic connectivity confirmed');
        }
      } catch (connectError) {
        console.warn('Basic connectivity test failed, but continuing:', connectError);
        // Don't fail here - continue with data fetching
      }
      
      // Run profile and operator queries in parallel for better performance
      console.log('1. Fetching profile and operator status in parallel...');
      
      const [profileResult, operatorResult] = await Promise.allSettled([
        Promise.race([
          supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', currentUser.id)
            .single(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Profile query timeout')), 10000))
        ]),
        Promise.race([
          supabase
            .from('platform_operators')
            .select('user_id')
            .eq('user_id', currentUser.id)
            .maybeSingle(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Operator query timeout')), 10000))
        ])
      ]);

      // Handle profile result
      if (profileResult.status === 'fulfilled') {
        const { data: profileData, error: profileError } = profileResult.value;
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setProfile({ full_name: 'User', avatar_url: null });
        } else {
          console.log('Profile data fetched successfully');
          setProfile(profileData ? { 
            full_name: profileData.full_name, 
            avatar_url: profileData.avatar_url 
          } : { full_name: 'User', avatar_url: null });
        }
      } else {
        console.error('Profile fetch failed:', profileResult.reason);
        setProfile({ full_name: 'User', avatar_url: null });
      }

      // Handle operator result
      if (operatorResult.status === 'fulfilled') {
        const { data: operatorData, error: operatorError } = operatorResult.value;
        if (operatorError) {
          console.error('Error checking platform operator status:', operatorError);
          setIsPlatformOperatorState(false);
        } else {
          console.log('Platform operator check completed');
          setIsPlatformOperatorState(!!operatorData);
        }
      } else {
        console.error('Operator check failed:', operatorResult.reason);
        setIsPlatformOperatorState(false);
      }

      console.log('2. Getting organization ID...');
      try {
        const orgIdResult = await Promise.race([
          supabase.rpc('get_current_organization_id'),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('OrgID query timeout')), 10000))
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
        console.log('3. Fetching organization details...');
        try {
          const orgResult = await Promise.race([
            supabase
              .from('organizations')
              .select('*')
              .eq('id', orgId)
              .single(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Organization query timeout')), 8000))
          ]);

          const { data: orgData, error: orgError } = orgResult;
          
          if (orgError) {
            console.error('Error fetching organization details:', orgError);
            setOrganization(null);
          } else if (orgData) {
            console.log('Organization details fetched successfully');
            const orgWithDefaults = {
              ...orgData,
              owner_id: null
            };
            setOrganization(orgWithDefaults as FullOrganizationType);
          } else {
            console.log('No organization found');
            setOrganization(null);
          }
        } catch (error) {
          console.error('Organization fetch failed:', error);
          setOrganization(null);
        }

        console.log('4. Fetching membership details...');
        try {
          const membershipResult = await Promise.race([
            supabase
              .from('organization_members')
              .select('*')
              .eq('user_id', currentUser.id)
              .eq('organization_id', orgId)
              .single(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Membership timeout')), 8000))
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