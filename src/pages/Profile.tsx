
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/common/UserAvatar";
import PageLayout from "@/components/layout/PageLayout";

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    avatar_url: null as string | null,
    email: ""
  });

  // Upload avatar to Supabase Storage
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}-${Math.random()}.${fileExt}`;

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user's profile
      await updateProfile({
        ...profile,
        avatar_url: urlData.publicUrl
      });

      toast.success("Avatar updated successfully");
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error("Error uploading avatar");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (formData: typeof profile) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          avatar_url: formData.avatar_url
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(formData);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(profile);
  };

  // Fetch profile data on component mount
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

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={profile.email} 
                    disabled 
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input 
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                  />
                </div>
              </CardContent>
              
              <CardFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Your Avatar</CardTitle>
              <CardDescription>
                Upload a profile picture
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <UserAvatar 
                  src={profile.avatar_url} 
                  name={profile.full_name} 
                  size="lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="avatar">Upload New Avatar</Label>
                <Input 
                  id="avatar" 
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default Profile;
