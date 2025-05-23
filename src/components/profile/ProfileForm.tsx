import { useState } from "react";
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
}

const ProfileForm = ({ profile, loading, setLoading }: ProfileFormProps) => {
  const [formData, setFormData] = useState({
    full_name: profile.full_name,
    quick_access_pin: profile.quick_access_pin || ''
  });

  const updateProfile = async () => {
    try {
      setLoading(true);

      // Validate PIN if provided
      if (formData.quick_access_pin && formData.quick_access_pin.length !== 4) {
        toast.error("Quick Access PIN must be exactly 4 digits");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          quick_access_pin: formData.quick_access_pin || null
        })
        .eq('id', profile.id);

      if (error) throw error;

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
            </Label>
            <div className="flex gap-2">
              <Input 
                id="quick_access_pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                value={formData.quick_access_pin}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder="••••"
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
                      toast.success("PIN cleared. Remember to save changes.");
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Clear PIN
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Set a 4-digit PIN for mobile QR code scanning. Leave empty to disable.
            </p>
            {!profile.quick_access_pin && formData.quick_access_pin.length === 4 && (
              <p className="text-xs text-green-600">
                ✓ PIN is ready. Click "Save Changes" to activate mobile scanning.
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
