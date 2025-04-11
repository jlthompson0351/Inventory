
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/common/UserAvatar";

interface AvatarUploadProps {
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onAvatarUpdated: (newAvatarUrl: string) => void;
}

const AvatarUpload = ({ profile, loading, setLoading, onAvatarUpdated }: AvatarUploadProps) => {
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
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: urlData.publicUrl
        })
        .eq('id', profile.id);
        
      if (updateError) throw updateError;
      
      // Call the callback to update parent component state
      onAvatarUpdated(urlData.publicUrl);
      toast.success("Avatar updated successfully");
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error("Error uploading avatar");
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
};

export default AvatarUpload;
