import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  quick_access_pin?: string | null;
}

export const useProfileData = () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    id: "",
    full_name: "",
    avatar_url: null,
    email: "",
    quick_access_pin: null
  });

  // Fetch profile data function
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) return;

      // Get profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If profile exists, use it; otherwise, create a bare minimum profile
      if (data) {
        setProfile({
          id: userData.user.id,
          full_name: data.full_name || userData.user.user_metadata?.name || "",
          avatar_url: data.avatar_url,
          email: userData.user.email || "",
          quick_access_pin: data.quick_access_pin
        });
      } else {
        setProfile({
          id: userData.user.id,
          full_name: userData.user.user_metadata?.name || "",
          avatar_url: null,
          email: userData.user.email || "",
          quick_access_pin: null
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error("Could not load profile information");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch profile data on hook mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Function to update the avatar URL in the state
  const updateAvatar = (newAvatarUrl: string) => {
    setProfile({ ...profile, avatar_url: newAvatarUrl });
  };

  // Function to refetch profile data (useful after updates)
  const refetchProfile = fetchProfile;

  return { profile, loading, setLoading, updateAvatar, refetchProfile };
};
