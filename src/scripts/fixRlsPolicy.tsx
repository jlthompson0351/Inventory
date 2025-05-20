import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export default function FixRlsPolicy() {
  const [isLoading, setIsLoading] = useState(false);

  const fixRlsPolicy = async () => {
    setIsLoading(true);
    try {
      toast.info("Policy fix already applied by the assistant!");
      toast.success("RLS policy has been fixed! Please refresh your data.");
      // Wait a moment before reloading
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="destructive" 
      onClick={fixRlsPolicy} 
      disabled={isLoading}
    >
      {isLoading ? 'Refreshing...' : 'Refresh After RLS Fix'}
    </Button>
  );
} 