import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileInput, MoreVertical, Plus, FileCheck, FilePlus, Loader2, AlertTriangle, AlertCircle, Archive, ArchiveRestore, Settings, Users, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getForms, deleteForm, getArchivedForms, restoreForm } from "@/services/formService";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FormRow } from "@/integrations/supabase/types";
import { getFormAssetTypeLinks } from '@/services/assetTypeService';

type ViewMode = "active" | "archived";

const Forms = () => {
  const { currentOrganization, isLoading: isOrgLoading } = useOrganization();
  const { toast } = useToast();
  const [activeForms, setActiveForms] = useState<FormRow[]>([]);
  const [archivedForms, setArchivedForms] = useState<FormRow[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formToAction, setFormToAction] = useState<{ id: string, name: string, action: 'archive' | 'restore' } | null>(null);
  const [hasAssetTypeLinksOnConfirm, setHasAssetTypeLinksOnConfirm] = useState(false);
  
  const [formAssetTypeLinks, setFormAssetTypeLinks] = useState<Record<string, any[]>>({});
  const [loadingAssetTypeLinks, setLoadingAssetTypeLinks] = useState(false);
  const [formsDataLoaded, setFormsDataLoaded] = useState(false);
  const currentOrgId = useMemo(() => currentOrganization?.id, [currentOrganization?.id]);

  const fetchDataBasedOnViewMode = useCallback(async () => {
    if (!currentOrgId) return;
    
    setIsLoading(true);
    setFormsDataLoaded(false);
    // Reset asset type links when fetching new data
    setFormAssetTypeLinks({});
    setLoadingAssetTypeLinks(false);
    
    try {
      let data;
      if (viewMode === "active") {
        data = await getForms(currentOrgId);
        setActiveForms(data || []);
        setArchivedForms([]);
      } else {
        data = await getArchivedForms(currentOrgId);
        setArchivedForms(data || []);
        setActiveForms([]);
      }
    } catch (error) {
      console.error(`Error fetching ${viewMode} forms:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load ${viewMode} forms`,
      });
      setActiveForms([]);
      setArchivedForms([]);
    } finally {
      setIsLoading(false);
      setFormsDataLoaded(true);
    }
  }, [currentOrgId, viewMode, toast]);

  useEffect(() => {
    if (!isOrgLoading && currentOrgId) {
      fetchDataBasedOnViewMode();
    } else if (!isOrgLoading && !currentOrgId) {
      setActiveForms([]);
      setArchivedForms([]);
    }
  }, [currentOrgId, isOrgLoading, fetchDataBasedOnViewMode]);

  const checkFormReferences = async (formId: string) => {
    try {
      const { data: intakeRefs } = await supabase.from('asset_types').select('id').eq('intake_form_id', formId);
      const { data: inventoryRefs } = await supabase.from('asset_types').select('id').eq('inventory_form_id', formId);
      const { data: mappedFieldsRefs } = await supabase.from('mapped_fields').select('id').eq('form_id', formId);
      return (intakeRefs && intakeRefs.length > 0) || (inventoryRefs && inventoryRefs.length > 0) || (mappedFieldsRefs && mappedFieldsRefs.length > 0);
    } catch (error) {
      console.error("Error checking form references:", error);
      return false;
    }
  };

  const confirmAction = async (form: { id: string, name: string }, action: 'archive' | 'restore') => {
    setFormToAction({ ...form, action });
    if (action === 'archive') {
      const hasLinks = await checkFormReferences(form.id);
      setHasAssetTypeLinksOnConfirm(hasLinks);
    } else {
      setHasAssetTypeLinksOnConfirm(false);
    }
    setDialogOpen(true);
  };

  const handleFormAction = async () => {
    if (!formToAction) return;
    const { id, name, action } = formToAction;

    setActionInProgress(id);
    try {
      if (action === 'archive') {
        await deleteForm(id);
        toast({ title: "Form Archived", description: `"${name}" has been archived.` });
      } else {
        await restoreForm(id);
        toast({ title: "Form Restored", description: `"${name}" has been restored.` });
      }
      fetchDataBasedOnViewMode();
      setDialogOpen(false);
    } catch (error: any) {
      console.error(`Error ${action} form:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${action} form. ${error.message || ''}`,
      });
    } finally {
      setActionInProgress(null);
      setFormToAction(null);
    }
  };

  const displayForms = useMemo(() => {
    return viewMode === 'active' ? activeForms : archivedForms;
  }, [viewMode, activeForms, archivedForms]);

  const isPageLoading = isOrgLoading || isLoading;

  useEffect(() => {
    if (!isOrgLoading && currentOrgId && formsDataLoaded && displayForms.length > 0) {
      setLoadingAssetTypeLinks(true);
      
      Promise.all(
        displayForms.map(form =>
          getFormAssetTypeLinks(form.id, currentOrgId)
            .then(links => ({ formId: form.id, links }))
            .catch((error) => {
              console.error(`Error loading asset type links for form ${form.id}:`, error);
              return { formId: form.id, links: [] };
            })
        )
      ).then(results => {
        const linksMap: Record<string, any[]> = {};
        results.forEach(({ formId, links }) => {
          linksMap[formId] = links || [];
        });
        setFormAssetTypeLinks(linksMap);
      }).catch(error => {
        console.error("Error fetching asset type links:", error);
        setFormAssetTypeLinks({}); 
      }).finally(() => {
        setLoadingAssetTypeLinks(false);
      });
    } else if (!formsDataLoaded || displayForms.length === 0) {
      // Reset loading state if no forms to load links for
      setLoadingAssetTypeLinks(false);
      setFormAssetTypeLinks({});
    }
  }, [isOrgLoading, currentOrgId, formsDataLoaded, displayForms]);

  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header with Dashboard Feel */}
      <div className="relative bg-white/90 backdrop-blur-sm border-b border-white/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <FileInput className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Forms
                </h1>
                <p className="text-gray-600 text-lg mt-1">
                  Create and manage inventory forms for data collection
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">Form builder ready</span>
                </div>
              </div>
            </div>
            
            {/* Quick Stats and Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-md border border-white/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Active Forms</p>
                      <p className="text-lg font-bold text-gray-800">{activeForms.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-md border border-white/50">
                  <div className="flex items-center gap-2">
                    <Archive className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-600">Archived</p>
                      <p className="text-lg font-bold text-gray-800">{archivedForms.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                asChild 
                disabled={viewMode === 'archived'}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 px-8 py-3 rounded-xl h-auto"
              > 
                <Link to="/forms/new">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Form
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Tabs Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Form Management</h3>
          </div>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList className="bg-gray-100 p-1 rounded-xl">
              <TabsTrigger 
                value="active" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg px-6 py-2 transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Active Forms ({activeForms.length})
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="archived"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg px-6 py-2 transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Archived Forms ({archivedForms.length})
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isPageLoading ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="p-4 bg-blue-500 rounded-full mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Forms</h3>
              <p className="text-gray-600">Please wait while we fetch your forms...</p>
            </div>
          </div>
        ) : !currentOrganization?.id ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-white" />
                <h3 className="text-xl font-bold text-white">No Organization Selected</h3>
              </div>
            </div>
            <div className="p-8 text-center">
              <p className="text-gray-600 text-lg mb-4">
                Please select an organization using the switcher in the header to view forms.
              </p>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 inline-block">
                <p className="text-red-700 text-sm">
                  Forms are organization-specific and require an active organization context.
                </p>
              </div>
            </div>
          </div>
        ) :
        displayForms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {displayForms.map((form) => {
              // Get the primary asset type color for gradient
              const primaryAssetTypeColor = formAssetTypeLinks[form.id]?.[0]?.asset_type_color;
              
              // Create dynamic gradient based on asset type color
              const getGradientClass = () => {
                if (viewMode === 'archived') {
                  return 'bg-gradient-to-r from-gray-400 to-gray-500';
                }
                
                if (primaryAssetTypeColor) {
                  // Create a lighter variant of the color for the gradient end
                  return '';  // We'll use inline styles for custom colors
                }
                
                // Fallback to original purple gradient
                return 'bg-gradient-to-r from-blue-500 to-purple-600';
              };
              
              // Create inline gradient style for custom asset type colors
              const gradientStyle = primaryAssetTypeColor && viewMode !== 'archived' ? {
                background: `linear-gradient(135deg, ${primaryAssetTypeColor}, ${primaryAssetTypeColor}dd, ${primaryAssetTypeColor}ee)`
              } : {};
              
              return (
                <div key={form.id} className={`bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${viewMode === 'archived' ? 'opacity-70' : ''}`}>
                  {/* Compact Card Header with Dynamic Gradient */}
                  <div 
                    className={getGradientClass()}
                    style={gradientStyle}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg flex-shrink-0">
                            {viewMode === 'archived' ? (
                              <Archive className="h-4 w-4 text-white" />
                            ) : (
                              <FileInput className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-bold text-white leading-tight" title={form.name}>
                              {form.name}
                            </h3>
                            <p className="text-white/80 text-xs mt-1">
                              {viewMode === 'archived' ? 'Archived' : 'Active'}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-6 w-6 p-0 text-white hover:bg-white/20 flex-shrink-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {viewMode === 'active' ? (
                              <>
                                <DropdownMenuItem asChild><Link to={`/forms/${form.id}`} className="flex w-full">Edit Form</Link></DropdownMenuItem>
                                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                <DropdownMenuItem>Export</DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => confirmAction({ id: form.id, name: form.name }, 'archive')}
                                >
                                  Archive
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem onClick={() => confirmAction({ id: form.id, name: form.name }, 'restore')}>
                                <ArchiveRestore className="mr-2 h-4 w-4" /> Restore
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                {/* Compact Card Content */}
                <div className="p-4">
                  {/* Asset Type Links Section */}
                  {loadingAssetTypeLinks && viewMode === 'active' ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                        <span className="text-xs text-blue-700">Loading...</span>
                      </div>
                    </div>
                  ) : viewMode === 'active' ? (
                    formAssetTypeLinks[form.id] && formAssetTypeLinks[form.id].length > 0 ? (
                      <div className="mb-3">
                        <div className="flex items-center gap-1 mb-2">
                          <Users className="h-3 w-3 text-gray-600" />
                          <span className="text-xs font-medium text-gray-700">Asset Types</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {formAssetTypeLinks[form.id].slice(0, 3).map(link => (
                            <span
                              key={link.asset_type_id + link.purpose}
                              className="px-2 py-0.5 rounded-full text-xs font-medium shadow-sm"
                              style={{ backgroundColor: link.asset_type_color || '#e5e7eb', color: '#222' }}
                              title={`${link.asset_type_name}${link.purpose ? ` (${link.purpose})` : ''}`}
                            >
                              {link.asset_type_name.length > 12 ? 
                                `${link.asset_type_name.substring(0, 12)}...` : 
                                link.asset_type_name
                              }
                            </span>
                          ))}
                          {formAssetTypeLinks[form.id].length > 3 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                              +{formAssetTypeLinks[form.id].length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-600">No asset links</span>
                        </div>
                      </div>
                    )
                  ) : null}

                  {/* Compact Form Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-600">Created</span>
                      </div>
                      <span className="text-xs font-medium text-gray-800">
                        {new Date(form.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1">
                        <Settings className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-600">
                          {viewMode === 'active' ? 'Updated' : 'Archived'}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-gray-800">
                        {new Date(viewMode === 'active' ? form.updated_at : (form.deleted_at || form.updated_at)).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Compact Action Buttons */}
                  {viewMode === 'active' && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        className="flex-1 h-8 text-xs border border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                      >
                        <Link to={`/forms/edit/${form.id}`} className="flex items-center justify-center gap-1">
                          <Settings className="h-3 w-3" />
                          Edit
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        className="flex-1 h-8 text-xs border border-green-200 hover:border-green-300 hover:bg-green-50"
                      >
                        <Link to={`/forms/preview/${form.id}`} className="flex items-center justify-center gap-1">
                          <FileCheck className="h-3 w-3" />
                          Preview
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-dashed border-gray-300 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-100 to-blue-100 p-8 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                  {viewMode === 'active' ? (
                    <div className="p-4 bg-blue-500 rounded-full inline-block mb-4">
                      <FilePlus className="h-12 w-12 text-white" />
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-500 rounded-full inline-block mb-4">
                      <Archive className="h-12 w-12 text-white" />
                    </div>
                  )}
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  No {viewMode} forms found
                </h2>
                
                <div className="space-y-3 text-gray-600">
                  {viewMode === 'active' ? (
                    <>
                      <p className="text-lg">Ready to create your first form?</p>
                      <p>Forms allow you to collect structured data from your team and integrate with your assets seamlessly.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg">No archived forms available</p>
                      <p>Archived forms will appear here when you archive them from the active forms view.</p>
                    </>
                  )}
                </div>
                
                {viewMode === 'active' && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <p className="font-medium text-gray-800">Create Form</p>
                      <p className="text-gray-600">Click "Create Form" to build your data collection form</p>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <p className="font-medium text-gray-800">Link to Assets</p>
                      <p className="text-gray-600">Connect forms to asset types for streamlined workflows</p>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <p className="font-medium text-gray-800">Collect Data</p>
                      <p className="text-gray-600">Start gathering structured data from your team</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Enhanced Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/50">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${formToAction?.action === 'archive' ? 'bg-red-100' : 'bg-green-100'}`}>
                {formToAction?.action === 'archive' ? (
                  <Archive className="h-5 w-5 text-red-600" />
                ) : (
                  <ArchiveRestore className="h-5 w-5 text-green-600" />
                )}
              </div>
              <DialogTitle className="text-xl font-bold">
                {formToAction?.action === 'archive' ? 'Archive Form' : 'Restore Form'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 text-base">
              Are you sure you want to {formToAction?.action} <span className="font-semibold">"{formToAction?.name}"</span>?
            </DialogDescription>
          </DialogHeader>
          
          {formToAction?.action === 'archive' && hasAssetTypeLinksOnConfirm && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 my-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 h-6 w-6 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800 mb-2">This form is linked to other resources</p>
                  <p className="text-sm text-amber-700">
                    The form will be unlinked from all asset types and any field mappings will be removed.
                    Asset types using this form will need to be updated with new forms.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)} 
              disabled={!!actionInProgress}
              className="px-6 py-2 border-2 border-gray-300 hover:border-gray-400"
            >
              Cancel
            </Button>
            <Button 
              variant={formToAction?.action === 'archive' ? "destructive" : "default"} 
              onClick={handleFormAction}
              disabled={!!actionInProgress}
              className={`px-6 py-2 ${formToAction?.action === 'archive' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
              } text-white shadow-lg hover:shadow-xl transition-all duration-200`}
            >
              {actionInProgress ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                formToAction?.action === 'archive' ? 'Archive Form' : 'Restore Form'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Forms;
