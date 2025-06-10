import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone } from "lucide-react";

interface ProfileFormProps {
  profile: {
    id: string;
    full_name: string;
    email: string;
    quick_access_pin?: string;
  };
  loading: boolean;
  setLoading: (loading: boolean) => void;
  refetchProfile: () => Promise<void>;
}

const ProfileForm = ({ profile, loading, setLoading, refetchProfile }: ProfileFormProps) => {
  const [formData, setFormData] = useState({
    full_name: profile.full_name,
    quick_access_pin: profile.quick_access_pin || ''
  });

  // Sync form data when profile changes (after refetch)
  useEffect(() => {
    setFormData({
      full_name: profile.full_name,
      quick_access_pin: '' // Always start with empty PIN field for security
    });
  }, [profile.full_name, profile.quick_access_pin]);

  const updateProfile = async () => {
    try {
      setLoading(true);

      // Validate PIN if provided
      if (formData.quick_access_pin && formData.quick_access_pin.length !== 4) {
        toast.error("Quick Access PIN must be exactly 4 digits");
        return;
      }

      // Prepare update data
      const updateData: any = {
        full_name: formData.full_name,
      };

      // Only update PIN if user provided a new value
      if (formData.quick_access_pin.trim() !== '') {
        updateData.quick_access_pin = formData.quick_access_pin;
      } else if (formData.quick_access_pin === '' && profile.quick_access_pin) {
        // User specifically cleared the PIN (empty string when there was a PIN before)
        updateData.quick_access_pin = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      
      // Refetch profile data to update the parent component
      await refetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile();
  };

  const handlePinChange = (value: string) => {
    // Only allow digits and max 4 characters
    const pin = value.replace(/\D/g, '').slice(0, 4);
    setFormData({...formData, quick_access_pin: pin});
  };

  return (
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
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick_access_pin" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Quick Access PIN
              {profile.quick_access_pin && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  ✓ PIN Set
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input 
                id="quick_access_pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                value={formData.quick_access_pin}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder={profile.quick_access_pin ? "Enter new PIN to change" : "••••"}
                className="text-center text-2xl tracking-widest max-w-[120px]"
                maxLength={4}
              />
              {profile.quick_access_pin && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear your PIN? You will need to set a new one to use mobile scanning.')) {
                      setFormData({...formData, quick_access_pin: ''});
                      toast.success("PIN will be cleared when you save changes.");
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Clear PIN
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {profile.quick_access_pin 
                ? "Your PIN is set. Enter a new 4-digit PIN to change it, or leave empty to keep current PIN."
                : "Set a 4-digit PIN for mobile QR code scanning."
              }
            </p>
            {!profile.quick_access_pin && formData.quick_access_pin.length === 4 && (
              <p className="text-xs text-green-600">
                ✓ PIN is ready. Click "Save Changes" to activate mobile scanning.
              </p>
            )}
            {profile.quick_access_pin && formData.quick_access_pin.length === 4 && (
              <p className="text-xs text-orange-600">
                ⚠ PIN will be changed to the new value when you save.
              </p>
            )}
          </div>
        </CardContent>
        
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProfileForm;
