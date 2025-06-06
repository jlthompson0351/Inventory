import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePasswordRequirement() {
  const { user } = useAuth();
  const [isPasswordChangeRequired, setIsPasswordChangeRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsPasswordChangeRequired(false);
      setIsLoading(false);
      return;
    }

    checkPasswordRequirement();
  }, [user]);

  const checkPasswordRequirement = async () => {
    try {
      const { data, error } = await supabase.rpc('check_password_change_required');
      if (error) throw error;
      setIsPasswordChangeRequired(data || false);
    } catch (error) {
      console.error('Error checking password requirement:', error);
      setIsPasswordChangeRequired(false);
    } finally {
      setIsLoading(false);
    }
  };

  const markPasswordChanged = async () => {
    try {
      const { error } = await supabase.rpc('mark_password_changed');
      if (error) throw error;
      setIsPasswordChangeRequired(false);
      return true;
    } catch (error) {
      console.error('Error marking password as changed:', error);
      return false;
    }
  };

  return {
    isPasswordChangeRequired,
    isLoading,
    markPasswordChanged,
    recheckRequirement: checkPasswordRequirement
  };
} 