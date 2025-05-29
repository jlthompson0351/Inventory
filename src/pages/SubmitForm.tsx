import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  ClipboardCheck, 
  QrCode,
  Calculator,
  Calendar,
  Plus,
  Edit 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { getFormWithRelatedData } from "@/services/formService";
import { submitForm } from "@/services/formSubmissionService";
import { applyAssetCalculationFormulas } from "@/services/inventoryService";
import { FormRenderer } from "@/components/ui/form-renderer";
import { useOrganization } from "@/hooks/useOrganization";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { applyFormulaMappings } from '@/services/formulaMappingService';
import { clearAssetCacheForOrg } from "@/components/inventory/AssetList";

export default function SubmitForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [validationRules, setValidationRules] = useState<any[]>([]);
  const [fieldDependencies, setFieldDependencies] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasFormulaFields, setHasFormulaFields] = useState(false);
  const [assetMetadata, setAssetMetadata] = useState<Record<string, any>>({});
  const [mergedFormData, setMergedFormData] = useState<Record<string, any>>({});
  
  // New states for monthly inventory tracking
  const [existingSubmissionId, setExistingSubmissionId] = useState<string | null>(null);
  const [existingSubmissionDate, setExistingSubmissionDate] = useState<Date | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  
  // Parse URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const urlAssetId = searchParams.get('asset_id');
  const urlFormType = searchParams.get('type');
  
  // Retrieve QR code scan context if available (from navigation state or URL params)
  const assetId = location.state?.assetId || urlAssetId;
  const assetName = location.state?.assetName;
  const assetTypeId = location.state?.assetTypeId;
  const formType = location.state?.formType || urlFormType || 'generic';
  
  // Stabilize these objects to prevent infinite re-renders
  const prefillData = useMemo(() => location.state?.prefillData || {}, [location.state?.prefillData]);
  const calculationFormulas = useMemo(() => location.state?.calculationFormulas || {}, [location.state?.calculationFormulas]);
  
  useEffect(() => {
    const loadForm = async () => {
      if (!id || !currentOrganization) return;
      
      try {
        setLoading(true);
        const { form: fetchedForm, validationRules: fetchedValidationRules, fieldDependencies: fetchedFieldDependencies } = await getFormWithRelatedData(id);
        
        if (fetchedForm) {
          setForm(fetchedForm);
          setValidationRules(fetchedValidationRules || []);
          setFieldDependencies(fetchedFieldDependencies || []);
          
          const initialData: Record<string, any> = {};
          let formFields: any[] = [];
          if (fetchedForm.form_data) {
            const parsedFormData = typeof fetchedForm.form_data === 'string' 
              ? JSON.parse(fetchedForm.form_data) 
              : fetchedForm.form_data;
            formFields = Array.isArray(parsedFormData?.fields) ? parsedFormData.fields : [];
          }
          formFields.forEach((field: any) => {
            if (field.defaultValue !== undefined) {
              initialData[field.id] = field.defaultValue;
            }
          });
          
          let currentAssetMetadata: Record<string, any> = {};
          let assetDataForEffect: any = null;
          let finalMergedData = { ...initialData, ...prefillData }; // Start with initial and prefill
          let localIsEditingExisting = false; // Local variable to track if we're editing

          if (assetId) {
            // 1. Fetch base asset data and metadata
            try {
              const { data: fetchedAssetData, error: assetError } = await supabase
                .from('assets')
                .select('*, asset_types(*)') // Ensure asset_types data, including conversion_fields, is potentially here
                .eq('id', assetId)
                .single();
                
              if (!assetError && fetchedAssetData) {
                assetDataForEffect = fetchedAssetData;
                // Ensure metadata is an object, not a primitive
                const metadata = fetchedAssetData.metadata;
                currentAssetMetadata = (typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) 
                  ? metadata as Record<string, any>
                  : {};
                console.log('SubmitForm - Fetched base assetMetadata:', currentAssetMetadata);
                
                // Check for existing submissions this month
                const now = new Date();
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                
                const { data: existingSubmissions, error: submissionError } = await supabase
                  .from('form_submissions')
                  .select('id, submission_data, created_at')
                  .eq('form_id', id)
                  .eq('asset_id', assetId)
                  .eq('organization_id', currentOrganization.id)
                  .gte('created_at', firstDayOfMonth.toISOString())
                  .lte('created_at', lastDayOfMonth.toISOString())
                  .order('created_at', { ascending: false })
                  .limit(1);
                
                if (!submissionError && existingSubmissions && existingSubmissions.length > 0) {
                  const latestSubmission = existingSubmissions[0];
                  setExistingSubmissionId(latestSubmission.id);
                  setExistingSubmissionDate(new Date(latestSubmission.created_at));
                  
                  // Check if user wants to edit existing (default behavior)
                  const editExisting = searchParams.get('action') !== 'new';
                  localIsEditingExisting = editExisting; // Set local variable
                  setIsEditingExisting(editExisting);
                  
                  if (editExisting && latestSubmission.submission_data) {
                    // Merge existing submission data with defaults
                    const existingData = typeof latestSubmission.submission_data === 'string' 
                      ? JSON.parse(latestSubmission.submission_data)
                      : latestSubmission.submission_data;
                    
                    console.log('SubmitForm - Found existing submission from', latestSubmission.created_at);
                    console.log('SubmitForm - Loading existing data:', existingData);
                    console.log('SubmitForm - finalMergedData BEFORE merging existing:', { ...finalMergedData });
                    
                    // Override finalMergedData with existing submission data
                    // Latest submission data should take priority over everything else
                    Object.keys(existingData).forEach(key => {
                      finalMergedData[key] = existingData[key];
                    });
                    
                    console.log('SubmitForm - finalMergedData AFTER merging existing:', { ...finalMergedData });
                  }
                }
              } else if (assetError) {
                console.error('SubmitForm - Error fetching asset data:', assetError);
              }
            } catch (assetFetchError) {
              console.error('SubmitForm - Exception during asset data fetching/processing:', assetFetchError);
            }

            // 2. Augment currentAssetMetadata with conversion_fields from asset_type
            // Prefer asset_type_id from fetchedAssetData, fallback to location.state.assetTypeId
            const actualAssetTypeId = assetDataForEffect?.asset_type_id || assetTypeId; 

            if (actualAssetTypeId) {
              // Fetch asset_type details separately if not fully included or to be sure
              const { data: assetTypeData, error: assetTypeError } = await supabase
                .from('asset_types')
                .select('conversion_fields')
                .eq('id', actualAssetTypeId)
                .single();

              if (assetTypeError) {
                console.error('SubmitForm - Error fetching asset_type for conversion fields:', assetTypeError);
              }
              
              if (assetTypeData?.conversion_fields) {
                console.log('SubmitForm - Found conversion_fields in asset_type:', assetTypeData.conversion_fields);
                const conversionFields = assetTypeData.conversion_fields as any[];
                const metadataWithDefaults = { ...currentAssetMetadata }; // Start with current asset's metadata
                conversionFields.forEach(cf => {
                  if (cf.field_name && !(cf.field_name in metadataWithDefaults)) {
                    console.warn(`SubmitForm - Adding default (0) for missing conversion field: ${cf.field_name}`);
                    metadataWithDefaults[cf.field_name] = 0; 
                  }
                });
                currentAssetMetadata = metadataWithDefaults;
                console.log('SubmitForm - assetMetadata after adding conversion defaults:', currentAssetMetadata);
              } else {
                console.log('SubmitForm - No conversion_fields found for asset_type_id:', actualAssetTypeId);
              }
            } else {
              console.log('SubmitForm - No asset_type_id available to fetch conversion_fields.');
            }
          }
          
          // Set the potentially augmented assetMetadata to state for FormRenderer
          setAssetMetadata(currentAssetMetadata);

          // Apply formula mappings (e.g. for pre-filling form fields from asset metadata)
          // This should use the asset metadata that now includes conversion defaults.
          if (assetId && assetDataForEffect?.asset_type_id) {
            try {
              // DON'T populate form fields from asset metadata if we're editing existing
              // Only do this for new submissions
              if (!localIsEditingExisting) {
                formFields.forEach((field: any) => {
                  if (currentAssetMetadata[field.id] !== undefined) {
                    finalMergedData[field.id] = currentAssetMetadata[field.id];
                  }
                });
              }
              
              finalMergedData = await applyFormulaMappings(
                finalMergedData,
                assetDataForEffect.asset_type_id,
                currentAssetMetadata // Use metadata with conversion defaults
              );
              console.log('SubmitForm - finalMergedData after applyFormulaMappings:', finalMergedData);
            } catch (mappingError) {
              console.error('SubmitForm - Error applying formula mappings:', mappingError);
            }
          }
          
          // Apply asset-specific calculation formulas (if any, from location.state)
          if (Object.keys(calculationFormulas).length > 0) {
            setHasFormulaFields(true);
            try {
              console.log('SubmitForm - Applying asset-specific calculationFormulas using assetMetadata:', currentAssetMetadata);
              const processedData = await applyAssetCalculationFormulas(
                supabase,
                finalMergedData, // Current form data
                calculationFormulas,
                currentAssetMetadata // Metadata with conversion defaults
              );
              
              if (processedData) {
                finalMergedData = processedData;
                console.log('SubmitForm - finalMergedData after applyAssetCalculationFormulas:', finalMergedData);
              }
            } catch (formulaError) {
              console.error('SubmitForm - Error applying asset-specific calculation formulas:', formulaError);
            }
          }
          
          setFormData(finalMergedData);
          // setMergedFormData is likely redundant if formData is the single source of truth for FormRenderer's initialData
          // If setMergedFormData was for a different purpose, it might need finalMergedData too.
          // For now, let's assume formData is primary.
          setMergedFormData(finalMergedData); 
          
          console.log('SubmitForm - Final assetMetadata for FormRenderer:', currentAssetMetadata);
          console.log('SubmitForm - Final formData for FormRenderer:', finalMergedData);
          
          let debugFormFields: any[] = [];
          if (fetchedForm?.form_data) {
            const parsedData = typeof fetchedForm.form_data === 'string' 
              ? JSON.parse(fetchedForm.form_data) 
              : fetchedForm.form_data;
            debugFormFields = parsedData?.fields || [];
          }
          console.log('SubmitForm - DEBUG: Form fields with mapped.convert formulas:', debugFormFields.filter((f: any) => f.formula?.includes('mapped.convert')));

        } else {
          toast({
            title: 'Form Not Found',
            description: 'The requested form could not be found',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error loading form:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadForm();
  }, [id, currentOrganization?.id, assetId, toast]);
  
  const handleFormSubmit = async (data: any) => {
    if (!currentOrganization || !id) return;
    
    try {
      setSubmitting(true);
      
      // Get asset type ID from navigation state, prefill data, or form configuration
      const submissionAssetTypeId = assetTypeId || prefillData.asset_type_id || form.asset_type_id;
      
      if (isEditingExisting && existingSubmissionId) {
        // Update existing submission
        const { error: updateError } = await supabase
          .from('form_submissions')
          .update({
            submission_data: data,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubmissionId);
          
        if (updateError) {
          throw updateError;
        }
        
        toast({
          title: 'Inventory Updated',
          description: 'Monthly inventory has been updated successfully',
        });
      } else {
        // Create new submission
      const result = await submitForm(
        id,
        data,
        currentOrganization.id,
        submissionAssetTypeId,
        assetId // Pass the asset ID if this is from a QR code scan
      );
      
      toast({
        title: 'Form Submitted',
        description: 'Data has been recorded successfully',
      });
      }
      
      // Clear asset cache to refresh inventory quantities
      clearAssetCacheForOrg(currentOrganization.id);
      
      // Navigate based on form type
      if (formType === 'intake') {
        navigate('/inventory');
      } else if (formType === 'inventory') {
        navigate('/inventory');
      } else if (assetId) {
        navigate(`/inventory/${assetId}`);
      } else {
        navigate('/forms');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: isEditingExisting ? 'Update Failed' : 'Submission Failed',
        description: 'There was an error ' + (isEditingExisting ? 'updating' : 'submitting') + ' the form',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }
  
  if (!form) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <h2 className="text-xl font-bold mb-2">Form Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested form could not be found or you don't have access to it.</p>
        <Button onClick={() => navigate('/forms')}>Return to Forms</Button>
      </div>
    );
  }
  
  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{form.name}</h1>
          <p className="text-muted-foreground">{form.description || 'Complete and submit this form'}</p>
        </div>
      </div>
      
      {assetId && (
        <Alert className="mb-6">
          <QrCode className="h-4 w-4" />
          <AlertTitle>Form Pre-filled from QR Code</AlertTitle>
          <AlertDescription>
            This form has been pre-populated with data from {assetName || 'the scanned asset'}.
            {hasFormulaFields && (
              <span className="block mt-1">
                <Calculator className="h-4 w-4 inline mr-1" />
                Custom calculation formulas have been applied.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {existingSubmissionId && assetId && (
        <Alert className="mb-6" variant={isEditingExisting ? "default" : "default"}>
          <Calendar className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>
              {isEditingExisting ? 'Editing Existing Monthly Inventory' : 'Creating New Inventory Entry'}
            </span>
            {existingSubmissionDate && isEditingExisting && (
              <span className="text-sm text-muted-foreground">
                Last updated: {existingSubmissionDate.toLocaleDateString()} at {existingSubmissionDate.toLocaleTimeString()}
              </span>
            )}
          </AlertTitle>
          <AlertDescription>
            {isEditingExisting ? (
              <>
                You have already submitted inventory for this asset this month. 
                The form is showing your previous values for editing.
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('action', 'new');
                    window.location.href = newUrl.toString();
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create New Entry Instead
                </Button>
              </>
            ) : (
              <>
                Creating a new inventory entry even though one exists for this month.
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.delete('action');
                    window.location.href = newUrl.toString();
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Existing Entry Instead
                </Button>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardContent className="p-6">
          <FormRenderer
            form={form}
            validationRules={validationRules}
            fieldDependencies={fieldDependencies}
            onSubmit={handleFormSubmit}
            initialData={formData}
            submitButtonText={submitting ? 'Submitting...' : 'Submit Form'}
            submitButtonIcon={submitting ? Loader2 : Save}
            submitButtonDisabled={submitting}
            submitButtonIconProps={submitting ? { className: 'animate-spin' } : undefined}
            mappedFields={assetMetadata}
            assetName={assetName}
          />
        </CardContent>
      </Card>
    </div>
  );
} 