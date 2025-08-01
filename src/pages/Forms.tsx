import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileInput, MoreVertical, Plus, FileCheck, FilePlus, Loader2, AlertTriangle, AlertCircle, Archive, ArchiveRestore } from "lucide-react";
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
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-muted-foreground">Create and manage inventory forms</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button asChild disabled={viewMode === 'archived'}> 
            <Link to="/forms/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Form
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="mb-4">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {isPageLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading forms...</span>
        </div>
      ) : !currentOrganization?.id ? (
        <div className="container max-w-2xl py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
              <div>
                <h3 className="font-medium text-red-800">No Organization Selected</h3>
                <p className="text-sm text-red-700 mt-1">
                  Please select an organization using the switcher in the header to view forms.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) :
        displayForms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {displayForms.map((form) => (
              <Card key={form.id} className={`card-hover ${viewMode === 'archived' ? 'opacity-70' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`rounded-full p-1.5 mr-2 ${viewMode === 'archived' ? 'bg-gray-200' : 'bg-primary/10'}`}>
                        {viewMode === 'archived' ? <Archive className="h-4 w-4 text-gray-500" /> : <FileInput className="h-4 w-4 text-primary" />}
                      </div>
                      <div><CardTitle className="text-lg">{form.name}</CardTitle></div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
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
                </CardHeader>
                <CardContent>
                  {loadingAssetTypeLinks && viewMode === 'active' ? (
                    <div className="text-xs text-muted-foreground mt-1 mb-2">Loading asset types...</div>
                  ) : viewMode === 'active' ? (
                    formAssetTypeLinks[form.id] && formAssetTypeLinks[form.id].length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1 mb-2">
                        {formAssetTypeLinks[form.id].map(link => (
                          <span
                            key={link.asset_type_id + link.purpose}
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: link.asset_type_color || '#e5e7eb', color: '#222' }}
                            title={link.purpose ? `Purpose: ${link.purpose}` : ''}
                          >
                            {link.asset_type_name}
                            {link.purpose ? ` (${link.purpose})` : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground/70 mt-1 mb-2">Not linked to any asset types</div>
                    )
                  ) : null}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(form.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{viewMode === 'active' ? 'Updated:' : 'Archived:'}</span>
                      <span>{new Date(viewMode === 'active' ? form.updated_at : (form.deleted_at || form.updated_at)).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {viewMode === 'active' && (
                    <div className="mt-4 pt-4 border-t flex justify-between">
                      <Button variant="outline" size="sm" asChild><Link to={`/forms/edit/${form.id}`}>Edit</Link></Button>
                      <Button variant="outline" size="sm" asChild><Link to={`/forms/preview/${form.id}`}><FileCheck className="mr-2 h-4 w-4" />Preview</Link></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-center mb-8">
              {viewMode === 'active' ? <FilePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" /> : <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
              <h2 className="text-2xl font-semibold mb-2">No {viewMode} forms found</h2>
              <p className="text-muted-foreground max-w-md">
                {viewMode === 'active' ? 'Create your first form by clicking the "Create Form" button above.' : 'There are no archived forms to display.'}
              </p>
            </div>
          </div>
        )
      }
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formToAction?.action === 'archive' ? 'Archive Form' : 'Restore Form'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {formToAction?.action} "{formToAction?.name}"?
            </DialogDescription>
          </DialogHeader>
          
          {formToAction?.action === 'archive' && hasAssetTypeLinksOnConfirm && (
            <div className="bg-amber-50 p-3 rounded-md border border-amber-200 flex items-start gap-2 mb-4">
              <AlertTriangle className="text-amber-500 h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">This form is linked to other resources</p>
                <p className="text-xs text-amber-700 mt-1">
                  The form will be unlinked from all asset types and any field mappings will be removed.
                  Asset types using this form will need to be updated with new forms.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={!!actionInProgress}>Cancel</Button>
            <Button 
              variant={formToAction?.action === 'archive' ? "destructive" : "default"} 
              onClick={handleFormAction}
              disabled={!!actionInProgress}
            >
              {actionInProgress ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : (formToAction?.action === 'archive' ? 'Archive Form' : 'Restore Form')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Forms;
