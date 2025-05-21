import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FileInput, MoreVertical, Plus, FileCheck, FilePlus, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
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
import { getForms, deleteForm } from "@/services/formService";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FormRow } from "@/integrations/supabase/types";
import { getFormAssetTypeLinks } from '@/services/assetTypeService';

const Forms = () => {
  const { currentOrganization, isLoading: isOrgLoading } = useOrganization();
  const { toast } = useToast();
  const [forms, setForms] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{ id: string, name: string } | null>(null);
  const [hasAssetTypeLinks, setHasAssetTypeLinks] = useState(false);
  const [formAssetTypeLinks, setFormAssetTypeLinks] = useState<Record<string, any[]>>({});
  const [loadingAssetTypeLinks, setLoadingAssetTypeLinks] = useState(false);
  const hasLoadedFormsRef = useRef(false);
  const [formsLoaded, setFormsLoaded] = useState(false);

  useEffect(() => {
    if (!isOrgLoading && currentOrganization?.id) {
      loadForms();
    } else if (!isOrgLoading && !currentOrganization?.id) {
      setForms([]);
    }
  }, [currentOrganization?.id, isOrgLoading]);

  const loadForms = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      setLoading(true);
      let data;
      try {
        data = await getForms(currentOrganization.id);
        console.log("Loaded forms:", data);
      } catch (fetchError) {
        console.error("Error fetching forms:", fetchError);
        data = []; // Set to empty array on error
      }

      // Set forms only if the component is still mounted and data is valid
      setForms(data || []);
    } catch (error) {
      console.error("Error in loadForms:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load forms",
      });
      // Set forms to empty array to prevent further reloads
      setForms([]);
    } finally {
      setLoading(false);
      setFormsLoaded(true);
    }
  };
  
  const checkFormReferences = async (formId: string) => {
    try {
      // Check for asset type references
      const { data: intakeRefs } = await supabase
        .from('asset_types')
        .select('id')
        .eq('intake_form_id', formId);
      
      const { data: inventoryRefs } = await supabase
        .from('asset_types')
        .select('id')
        .eq('inventory_form_id', formId);
      
      // Check for mapped fields references
      const { data: mappedFieldsRefs } = await supabase
        .from('mapped_fields')
        .select('id')
        .eq('form_id', formId);
      
      const hasLinks = (intakeRefs && intakeRefs.length > 0) || 
                       (inventoryRefs && inventoryRefs.length > 0) ||
                       (mappedFieldsRefs && mappedFieldsRefs.length > 0);
      
      return hasLinks;
    } catch (error) {
      console.error("Error checking form references:", error);
      return false;
    }
  };

  const confirmDelete = async (form: { id: string, name: string }) => {
    setFormToDelete(form);
    
    try {
      const hasLinks = await checkFormReferences(form.id);
      setHasAssetTypeLinks(hasLinks);
    } catch (error) {
      console.error("Error checking asset type links:", error);
      setHasAssetTypeLinks(false);
    }
    
    setDeleteDialogOpen(true);
  };

  const handleDeleteForm = async () => {
    if (!formToDelete) return;
    
    try {
      setDeleting(formToDelete.id);
      await deleteForm(formToDelete.id);
      
      toast({
        title: "Form deleted",
        description: "The form has been deleted successfully",
      });
      
      loadForms(); // Reload the forms
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting form:", error);
      
      // Provide a more helpful error message
      let errorMessage = "Failed to delete form";
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setDeleting(null);
    }
  };

  const isPageLoading = isOrgLoading || loading;

  useEffect(() => {
    // Only fetch asset type links if we have forms and are not currently loading
    if (!isOrgLoading && currentOrganization?.id && formsLoaded && forms.length > 0 && !loadingAssetTypeLinks) {
      setLoadingAssetTypeLinks(true);
      
      // Use a timeout to prevent immediate re-render race conditions
      const timeoutId = setTimeout(() => {
        Promise.all(
          forms.map(form =>
            getFormAssetTypeLinks(form.id, currentOrganization.id)
              .then(links => ({ formId: form.id, links }))
              .catch(() => ({ formId: form.id, links: [] })) // Provide a default empty array on error for a specific form
          )
        ).then(results => {
          const linksMap: Record<string, any[]> = {};
          results.forEach(({ formId, links }) => {
            linksMap[formId] = links;
          });
          setFormAssetTypeLinks(linksMap);
        }).catch(error => {
          console.error("Error fetching asset type links:", error);
          // Optionally, set all links to empty or handle global error state
          setFormAssetTypeLinks({}); 
        }).finally(() => {
          setLoadingAssetTypeLinks(false);
        });
      }, 500); // Small delay to avoid immediate re-renders
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOrgLoading, currentOrganization?.id, formsLoaded, forms.length]); // Removed loadingAssetTypeLinks

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-muted-foreground">Create and manage inventory forms</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button asChild>
            <Link to="/forms/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Form
            </Link>
          </Button>
        </div>
      </div>

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
        forms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {forms.map((form) => {
              console.log(`Rendering form card for ID: ${form.id}`);
              return (
                <Card key={form.id} className="card-hover">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="rounded-full bg-primary/10 p-1.5 mr-2">
                          <FileInput className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{form.name}</CardTitle>
                          {/* Asset type badges */}
                          {loadingAssetTypeLinks ? (
                            <div className="text-xs text-muted-foreground mt-1">Loading asset types...</div>
                          ) : formAssetTypeLinks[form.id] && formAssetTypeLinks[form.id].length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
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
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Link to={`/forms/${form.id}`} className="flex w-full">
                              Edit form
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem>Export</DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => confirmDelete({ id: form.id, name: form.name })}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {/* Conditionally render status if it exists on the type */}
                      {/* 
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="capitalize">{form.status}</span>
                      </div>
                      */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{new Date(form.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Updated:</span>
                        <span>{new Date(form.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/forms/edit/${form.id}`}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/forms/preview/${form.id}`}>
                          <FileCheck className="mr-2 h-4 w-4" />
                          Preview
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-center mb-8">
              <FilePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No forms found</h2>
              <p className="text-muted-foreground max-w-md">
                Create your first form by clicking the "Create Form" button above
              </p>
            </div>
          </div>
        )
      }
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{formToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          
          {hasAssetTypeLinks && (
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
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={!!deleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteForm}
              disabled={!!deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
};

export default Forms;
