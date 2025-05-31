import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  quick_access_pin: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Set or update a user's 4-digit PIN for mobile QR authentication
 */
export const setUserPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate PIN format (4 digits)
    if (!/^[0-9]{4}$/.test(pin)) {
      return { success: false, error: 'PIN must be exactly 4 digits' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ quick_access_pin: pin })
      .eq('id', user.id);

    if (error) {
      console.error('Error setting PIN:', error);
      return { success: false, error: 'Failed to set PIN' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in setUserPin:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Remove a user's PIN
 */
export const removeUserPin = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ quick_access_pin: null })
      .eq('id', user.id);

    if (error) {
      console.error('Error removing PIN:', error);
      return { success: false, error: 'Failed to remove PIN' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeUserPin:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Check if a user has a PIN set
 */
export const getUserPin = async (): Promise<{ pin: string | null; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { pin: null, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('quick_access_pin')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error getting PIN:', error);
      return { pin: null, error: 'Failed to get PIN' };
    }

    return { pin: data?.quick_access_pin || null };
  } catch (error) {
    console.error('Error in getUserPin:', error);
    return { pin: null, error: 'An unexpected error occurred' };
  }
};

/**
 * Verify a PIN against the current user's stored PIN
 */
export const verifyUserPin = async (enteredPin: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { valid: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('quick_access_pin')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error verifying PIN:', error);
      return { valid: false, error: 'Failed to verify PIN' };
    }

    if (!data?.quick_access_pin) {
      return { valid: false, error: 'No PIN set for this user' };
    }

    return { valid: data.quick_access_pin === enteredPin };
  } catch (error) {
    console.error('Error in verifyUserPin:', error);
    return { valid: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Get user profile including PIN status
 */
export const getUserProfile = async (): Promise<{ profile: UserProfile | null; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { profile: null, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error getting profile:', error);
      return { profile: null, error: 'Failed to get profile' };
    }

    return { profile: data as UserProfile };
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return { profile: null, error: 'An unexpected error occurred' };
  }
}; 