import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import AccessDeniedCard from '@/components/system-admin/AccessDeniedCard';
import SystemStats from '@/components/system-admin/SystemStats';
import SystemSettings from '@/components/system-admin/SystemSettings';
import SystemLogs from '@/components/system-admin/SystemLogs';
import OrganizationMembersContent from '@/pages/OrganizationMembers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronLeft, Database, ServerCog, Users, Building, Plus, Paintbrush, MailIcon, Settings as SettingsIconLucide } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import OrganizationAvatarUpload from '@/components/organization/OrganizationAvatarUpload';
import { uploadOrgAvatar as uploadOrgAvatarService } from '@/services/organizationService';
import PlaceholderTab from '@/components/organization/tabs/PlaceholderTab';
import GeneralSettingsTab from '@/components/organization/tabs/GeneralSettingsTab';
import AdminSettingsTab from '@/components/organization/tabs/AdminSettingsTab';

const OrganizationAdminPage: React.FC = () => {
  const { user, userRoles, organization, fetchUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");
  const [systemStats, setSystemStats] = useState({
    organizationsCount: 0,
    usersCount: 0,
    assetsCount: 0,
    formsCount: 0
  });
  const [editingOrgName, setEditingOrgName] = useState("");
  const [editingOrgDescription, setEditingOrgDescription] = useState("");
  const [editingOrgAvatarFile, setEditingOrgAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingOrgDetails, setIsSavingOrgDetails] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userRoles.isOrgAdmin) {
      toast.error('You do not have permission to access organization settings.');
      navigate('/');
      return;
    }

    fetchSystemStats();
    if (organization) {
      setEditingOrgName(organization.name);
      setEditingOrgDescription(organization.description || "");
      setAvatarPreview(organization.avatar_url || null);
      setLoading(false);
    } else {
      setLoading(false); 
    }
  }, [navigate, userRoles.isOrgAdmin, organization]);

  const fetchSystemStats = async () => {
    try {
      const { count: orgsCount } = await supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('id', organization?.id);
      const { count: usersCount } = await supabase.from('organization_members').select('user_id', { count: 'exact', head: true }).eq('organization_id', organization?.id);
      const { count: assetsCount } = await supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('organization_id', organization?.id);
      const { count: formsCount } = await supabase.from('forms').select('id', { count: 'exact', head: true }).eq('organization_id', organization?.id);
      
      setSystemStats({
        organizationsCount: orgsCount || 0,
        usersCount: usersCount || 0,
        assetsCount: assetsCount || 0,
        formsCount: formsCount || 0
      });
    } catch (error) {
      console.error('Error fetching organization stats:', error);
      toast.error('Failed to load organization statistics');
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (loading && !organization) {
    return <div className="p-4">Loading organization settings...</div>; 
  }

  if (!userRoles.isOrgAdmin) {
    return <AccessDeniedCard />;
  }

  const handleSaveOrgDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !editingOrgName.trim()) {
      toast.error("Organization name cannot be empty.");
      return;
    }
    setIsSavingOrgDetails(true);
    try {
      let newAvatarUrl = organization.avatar_url;
      if (editingOrgAvatarFile) {
        const uploadedUrl = await uploadOrgAvatarService(organization.id, editingOrgAvatarFile);
        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
        } else {
          toast.error("Failed to upload new avatar. Other changes might be saved.");
        }
      }

      const updates: { name: string; description: string; avatar_url: string | null; updated_at: string } = {
        name: editingOrgName.trim(),
        description: editingOrgDescription.trim(),
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id);

      if (error) throw error;
      toast.success("Organization details updated successfully!");
      if (user) {
        await fetchUserData(user);
      }
      setEditingOrgAvatarFile(null);
    } catch (error) {
      console.error("Error updating organization details:", error);
      toast.error("Failed to update organization details.");
    } finally {
      setIsSavingOrgDetails(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 gap-6">
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleGoBack} 
                className="rounded-full h-8 w-8 mr-1"
                title="Back to Dashboard"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-2xl font-bold">Organization Settings</CardTitle>
                <CardDescription>
                  Manage your organization settings, members, and configurations.
                </CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="hidden md:flex items-center gap-1" 
              size="sm" 
              onClick={handleGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 mb-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Members</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Paintbrush className="h-4 w-4" />
                <span className="hidden sm:inline">Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <MailIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="advanced_settings" className="flex items-center gap-2">
                <SettingsIconLucide className="h-4 w-4" />
                <span className="hidden sm:inline">Advanced</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Statistics</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              {loading ? (
                <p className="text-muted-foreground">Loading organization details...</p>
              ) : organization ? (
                <GeneralSettingsTab
                  orgName={editingOrgName}
                  setOrgName={setEditingOrgName}
                  orgDescription={editingOrgDescription}
                  setOrgDescription={setEditingOrgDescription}
                  avatarPreview={avatarPreview}
                  setAvatarPreview={setAvatarPreview}
                  setOrgAvatar={setEditingOrgAvatarFile}
                  handleSubmit={handleSaveOrgDetails}
                  isSubmitting={isSavingOrgDetails}
                />
              ) : (
                <p className="text-destructive">Organization data could not be loaded. Please try again later.</p>
              )}
            </TabsContent>

            <TabsContent value="members">
              <OrganizationMembersContent />
            </TabsContent>

            <TabsContent value="appearance">
              <PlaceholderTab title="Appearance Settings" description="Customize colors, themes, and branding for your organization." />
            </TabsContent>

            <TabsContent value="notifications">
              <PlaceholderTab title="Notification Settings" description="Manage how your organization members receive notifications." />
            </TabsContent>
            
            <TabsContent value="advanced_settings">
              {organization ? (
                <AdminSettingsTab organizationId={organization.id} />
              ) : (
                <p className="text-muted-foreground">Organization context not available for advanced settings.</p>
              )}
            </TabsContent>

            <TabsContent value="stats">
              <SystemStats initialStats={systemStats} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationAdminPage; 