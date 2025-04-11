
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

export const useProfileData = () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    id: "",
    full_name: "",
    avatar_url: null,
    email: ""
  });

  // Fetch profile data on hook mount
  useEffect(() => {
    const fetchProfile = async () => {
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
            email: userData.user.email || ""
          });
        } else {
          setProfile({
            id: userData.user.id,
            full_name: userData.user.user_metadata?.name || "",
            avatar_url: null,
            email: userData.user.email || ""
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error("Could not load profile information");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Function to update the avatar URL in the state
  const updateAvatar = (newAvatarUrl: string) => {
    setProfile({ ...profile, avatar_url: newAvatarUrl });
  };

  return { profile, loading, setLoading, updateAvatar };
};
