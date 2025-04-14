
import { Card } from "@/components/ui/card";
import ProfileForm from "@/components/profile/ProfileForm";
import AvatarUpload from "@/components/profile/AvatarUpload";
import { useProfileData } from "@/hooks/useProfileData";

const Profile = () => {
  const { profile, loading, setLoading, updateAvatar } = useProfileData();

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <ProfileForm 
          profile={profile}
          loading={loading}
          setLoading={setLoading}
        />
        
        <AvatarUpload 
          profile={profile}
          loading={loading}
          setLoading={setLoading}
          onAvatarUpdated={updateAvatar}
        />
      </div>
    </div>
  );
};

export default Profile;
