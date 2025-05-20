import { createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Create a context for the Supabase client
const SupabaseContext = createContext({ supabase });

// Provider component to wrap the app with
export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};

// Hook to use the Supabase client
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}; 