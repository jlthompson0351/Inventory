import { useState, useEffect, useMemo, useCallback } from "react";
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
  Edit,
  Package,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  const [fetchedAssetTypeId, setFetchedAssetTypeId] = useState<string | null>(null);
  const [assetDetails, setAssetDetails] = useState<any>(null); // Store full asset details
  
  // New states for monthly inventory tracking
  const [existingSubmissionId, setExistingSubmissionId] = useState<string | null>(null);
  const [existingSubmissionDate, setExistingSubmissionDate] = useState<Date | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  
  // Parse URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const urlAssetId = searchParams.get('asset_id');
  const urlFormType = searchParams.get('type');
  const actionParam = searchParams.get('action'); // 'new' or default to continue
  const fromMobileQR = searchParams.get('fromMobileQR') === 'true' || location.state?.fromMobileQR;
  
  // Retrieve QR code scan context if available (from navigation state or URL params)
  const assetId = location.state?.assetId || urlAssetId;
  const assetName = location.state?.assetName || assetDetails?.name;
  const assetTypeId = location.state?.assetTypeId || assetDetails?.asset_type_id;
  const formType = location.state?.formType || urlFormType || 'generic';
  const forceNewEntry = location.state?.forceNewEntry || actionParam === 'new';
  
  // Stabilize these objects to prevent infinite re-renders
  const prefillData = useMemo(() => location.state?.prefillData || {}, [location.state?.prefillData]);
  const calculationFormulas = useMemo(() => location.state?.calculationFormulas || {}, [location.state?.calculationFormulas]);
  
  const [showCalculatedFields, setShowCalculatedFields] = useState(false);
  
  const loadForm = useCallback(async () => {
    // loadForm function called
    
    if (!id) {
      // Missing form ID, exiting early
      return;
    }
    
    // For mobile QR workflow, we can proceed without currentOrganization initially
    // We'll get the organization from the form data
    if (!currentOrganization && !fromMobileQR) {
      // Missing currentOrganization and not from mobile QR, exiting early
      return;
    }
    
    try {
      // Setting loading to true
      setLoading(true);
      
      // Calling getFormWithRelatedData
      const { form: fetchedForm, validationRules: fetchedValidationRules, fieldDependencies: fetchedFieldDependencies } = await getFormWithRelatedData(id);
      // getFormWithRelatedData completed
      
      if (fetchedForm) {
        // Form found, processing
        
        // For mobile QR, use the organization from the form if currentOrganization is not available
        let workingOrganization = currentOrganization;
        if (!workingOrganization && fromMobileQR && fetchedForm.organization_id) {
          // Using organization from form for mobile QR
          workingOrganization = { id: fetchedForm.organization_id };
        }
        
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
              .select('*, asset_types(*)')
              .eq('id', assetId)
              .single();
              
            if (!assetError && fetchedAssetData) {
              assetDataForEffect = fetchedAssetData;
              setAssetDetails(fetchedAssetData); // Store asset details for header
              
              // Store the asset type ID for later use
              if (fetchedAssetData.asset_type_id) {
                setFetchedAssetTypeId(fetchedAssetData.asset_type_id);
              }
              // Ensure metadata is an object, not a primitive
              const metadata = fetchedAssetData.metadata;
              currentAssetMetadata = (typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) 
                ? metadata as Record<string, any>
                : {};
              // Fetched base assetMetadata
              
              // Fetch the inventory item for this asset to get the current quantity
              // SKIP for intake forms - we want them to start blank
              if (formType !== 'intake') {
                const { data: inventoryItem, error: inventoryError } = await supabase
                  .from('inventory_items')
                  .select('quantity, id')
                  .eq('asset_id', assetId)
                  .single();
                
                if (!inventoryError && inventoryItem) {
                  currentAssetMetadata.current_inventory = inventoryItem.quantity;
                  // Added current inventory quantity
                  
                  // Fetch the most recent inventory history to get the starting point
                  const currentMonth = new Date().toISOString().slice(0, 7);
                  const { data: recentHistory, error: historyError } = await supabase
                    .from('inventory_history')
                    .select('quantity, month_year, check_date')
                    .eq('inventory_item_id', inventoryItem.id)
                    .lt('month_year', currentMonth) // Get history before current month
                    .order('check_date', { ascending: false })
                    .limit(1)
                    .single();
                  
                  if (!historyError && recentHistory) {
                    // Use the most recent past inventory as the starting point
                    currentAssetMetadata.starting_inventory = recentHistory.quantity;
                    // Found previous inventory
                  } else {
                    // If no previous history, use current inventory as starting point
                    currentAssetMetadata.starting_inventory = inventoryItem.quantity;
                    // No previous history found, using current inventory as starting point
                  }
                }
              } else {
                // Skipping inventory pre-population for intake form
              }
              
              // Check for existing submissions this month
              // Only do this if we have a working organization
              if (workingOrganization) {
                const now = new Date();
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                
                const { data: existingSubmissions, error: submissionError } = await supabase
                  .from('form_submissions')
                  .select('id, submission_data, created_at')
                  .eq('form_id', id)
                  .eq('asset_id', assetId)
                  .eq('organization_id', workingOrganization.id)
                  .gte('created_at', firstDayOfMonth.toISOString())
                  .lte('created_at', lastDayOfMonth.toISOString())
                  .order('created_at', { ascending: false })
                  .limit(1);
                
                if (!submissionError && existingSubmissions && existingSubmissions.length > 0) {
                  const latestSubmission = existingSubmissions[0];
                  setExistingSubmissionId(latestSubmission.id);
                  setExistingSubmissionDate(new Date(latestSubmission.created_at));
                  
                  // Check if user wants to edit existing (default behavior)
                  // BUT respect forceNewEntry flag for "New Inventory" button
                  // ALSO skip editing existing for intake forms - intake should always be new
                  const editExisting = !forceNewEntry && actionParam !== 'new' && formType !== 'intake';
                  localIsEditingExisting = editExisting; // Set local variable
                  setIsEditingExisting(editExisting);
                  
                  if (editExisting && latestSubmission.submission_data) {
                    // Merge existing submission data with defaults
                    const existingData = typeof latestSubmission.submission_data === 'string' 
                      ? JSON.parse(latestSubmission.submission_data)
                      : latestSubmission.submission_data;
                    
                                  // Found existing submission
                    
                    // Override finalMergedData with existing submission data
                    // Latest submission data should take priority over everything else
                    Object.keys(existingData).forEach(key => {
                      finalMergedData[key] = existingData[key];
                    });
                    
                    // finalMergedData AFTER merging existing
                  } else if (!editExisting) {
                    // For new entries, still need to ensure we have current inventory
                    // This was already fetched above but make sure it's available
                    // Creating new entry with current inventory
                  }
                }
              } else {
                // Skipping existing submission check (no working organization)
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
              // Found conversion_fields in asset_type
              const conversionFields = assetTypeData.conversion_fields as any[];
              const metadataWithDefaults = { ...currentAssetMetadata }; // Start with current asset's metadata
              
              // Process conversion fields and add them to metadata
              if (Array.isArray(conversionFields)) {
                conversionFields.forEach(cf => {
                  if (cf.field_name) {
                    // Check if the field exists in asset metadata, otherwise use default
                    if (!(cf.field_name in metadataWithDefaults)) {
                      // Use 1.0 as default for conversion fields instead of 0 so math works
                      const defaultValue = cf.field_name.startsWith('convert_') ? 1.0 : (cf.default_value !== undefined ? cf.default_value : 0);
                      // Adding default for missing conversion field
                      metadataWithDefaults[cf.field_name] = defaultValue;
                    } else {
                      // Using existing value for conversion field
                    }
                  }
                });
              }
              
              currentAssetMetadata = metadataWithDefaults;
              // assetMetadata after adding conversion fields
            } else {
              // No conversion_fields found for asset_type_id
            }
          } else {
            // No asset_type_id available to fetch conversion_fields
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
            // ALSO skip for intake forms - they should start blank for easy data entry
            if (!localIsEditingExisting && formType !== 'intake') {
              formFields.forEach((field: any) => {
                if (currentAssetMetadata[field.id] !== undefined) {
                  finalMergedData[field.id] = currentAssetMetadata[field.id];
                }
              });
            } else if (formType === 'intake') {
              // Skipping form field pre-population for intake form
            }
            
            finalMergedData = await applyFormulaMappings(
              finalMergedData,
              assetDataForEffect.asset_type_id,
              currentAssetMetadata // Use metadata with conversion defaults
            );
            // finalMergedData after applyFormulaMappings
          } catch (mappingError) {
            console.error('SubmitForm - Error applying formula mappings:', mappingError);
          }
        }
        
        // Apply asset-specific calculation formulas (if any, from location.state)
        if (Object.keys(calculationFormulas).length > 0) {
          setHasFormulaFields(true);
          try {
                          // Applying asset-specific calculationFormulas
            const processedData = await applyAssetCalculationFormulas(
              supabase,
              finalMergedData, // Current form data
              calculationFormulas,
              currentAssetMetadata // Metadata with conversion defaults
            );
            
            if (processedData) {
              finalMergedData = processedData;
              // finalMergedData after applyAssetCalculationFormulas
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
        
                  // Final assetMetadata and formData for FormRenderer
        
        // Debug: Show what will be passed as mappedFields
                  // Mapped fields for calculations
        Object.entries(currentAssetMetadata).forEach(([key, value]) => {
                      // Conversion field value
        });
        
        // Additional debugging to ensure conversion fields are numbers
                  // Conversion fields as numbers
        Object.entries(currentAssetMetadata).forEach(([key, value]) => {
          if (key.startsWith('convert_')) {
            const numValue = Number(value);
                          // Conversion field numeric value
          }
        });
        
        let debugFormFields: any[] = [];
        if (fetchedForm?.form_data) {
          const parsedData = typeof fetchedForm.form_data === 'string' 
            ? JSON.parse(fetchedForm.form_data) 
            : fetchedForm.form_data;
          debugFormFields = parsedData?.fields || [];
        }
                  // DEBUG: Form fields with mapped.convert formulas
        
        // Log specific examples of formula fields
        debugFormFields.forEach((field: any) => {
          if (field.formula?.includes('mapped.convert')) {
                          // Field formula
            // Extract the conversion field name from the formula
            const match = field.formula.match(/\{mapped\.(convert_[^}]+)\}/);
            if (match) {
              const conversionField = match[1];
                                // Requires conversion field
            }
          }
        });

      } else {
                  // No form found
        toast({
          title: 'Form Not Found',
          description: 'The requested form could not be found',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('🚨 SubmitForm - Error loading form:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form. Please try again.',
        variant: 'destructive',
      });
    } finally {
      // Setting loading to false
      setLoading(false);
    }
  }, [id, currentOrganization?.id, assetId, prefillData, calculationFormulas, formType, forceNewEntry, actionParam, assetTypeId, fromMobileQR]);
  
  useEffect(() => {
    loadForm();
  }, [loadForm]);
  
  const handleFormSubmit = async (data: any) => {
    // For mobile QR workflow, use organization from form if currentOrganization is not available
    let workingOrganization = currentOrganization;
    if (!workingOrganization && fromMobileQR && form?.organization_id) {
      workingOrganization = { id: form.organization_id };
              // Using organization from form for submission
    }
    
    if (!workingOrganization || !id) {
      console.error('SubmitForm - Missing required parameters for submission:', { workingOrganization: !!workingOrganization, id });
      toast({
        title: 'Submission Error',
        description: 'Missing required information for form submission',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Re-fetch asset metadata right before submission to prevent using stale/cached data
      let freshAssetMetadata = { ...assetMetadata }; // Start with existing state as a fallback
      if (assetId) {
        const { data: freshAsset, error: fetchError } = await supabase
          .from('assets')
          .select('metadata')
          .eq('id', assetId)
          .single();

        if (fetchError) {
          console.error("SubmitForm - Could not re-fetch fresh asset data on submit. Using potentially stale data.", fetchError);
        } else if (freshAsset && typeof freshAsset.metadata === 'object' && freshAsset.metadata !== null) {
          console.log("SubmitForm - Successfully re-fetched fresh asset metadata on submit.", freshAsset.metadata);
          freshAssetMetadata = freshAsset.metadata as Record<string, any>;
        }
      }

      // Get asset type ID from multiple sources
      const submissionAssetTypeId = assetTypeId || fetchedAssetTypeId || prefillData.asset_type_id || form.asset_type_id;
      
      // AssetTypeId sources determined
      
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
        
        // Still need to run inventory update logic for edited submissions!
        // The submitForm service handles inventory updates, so we'll use it
        // but we need to ensure it processes the update correctly
        if (submissionAssetTypeId && assetId) {
          // For inventory forms, directly update the inventory
          if (formType === 'inventory' && form?.form_data) {
            const formSchema = typeof form.form_data === 'string' ? JSON.parse(form.form_data) : form.form_data;
            
            // Find field with inventory_action = 'set'
            const setField = formSchema.fields?.find((field: any) => field.inventory_action === 'set');
            if (setField && data[setField.id]) {
              const newQuantity = Number(data[setField.id]);
              
              if (!isNaN(newQuantity)) {
                // Get inventory item for this asset
                const { data: inventoryItem, error: fetchError } = await supabase
                  .from('inventory_items')
                  .select('id')
                  .eq('asset_id', assetId)
                  .single();
                  
                if (fetchError) {
                  console.error('Error fetching inventory item:', fetchError);
                } else if (inventoryItem) {
                  // Update inventory quantity (round for integer column)
                  const roundedQuantity = Math.round(newQuantity);
                  const { error: updateError } = await supabase
                    .from('inventory_items')
                    .update({
                      quantity: roundedQuantity, // Database expects integer
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', inventoryItem.id);
                    
                  if (updateError) {
                    console.error('Error updating inventory:', updateError);
                  } else {
                    // Inventory updated
                    
                    // Get current asset to preserve existing metadata (especially conversion rates)
                    const { data: currentAsset, error: assetFetchError } = await supabase
                      .from('assets')
                      .select('metadata')
                      .eq('id', assetId)
                      .single();
                    
                    if (!assetFetchError && currentAsset) {
                      // Preserve existing metadata and only update inventory-related fields
                      const preservedMetadata = (currentAsset.metadata as Record<string, any>) || {};
                      const updatedMetadata = {
                        ...preservedMetadata,
                        exact_quantity_gallons: newQuantity,
                        last_inventory_update: new Date().toISOString()
                      };
                      
                      const { error: assetUpdateError } = await supabase
                        .from('assets')
                        .update({
                          metadata: updatedMetadata
                        })
                        .eq('id', assetId);
                        
                      if (assetUpdateError) {
                        console.error('Error updating asset metadata with exact quantity:', assetUpdateError);
                      } else {
                        // Asset metadata updated while preserving conversion rates
                      }
                    }
                    
                    // Create inventory history record using RPC to avoid user_id error
                    // For mobile QR workflow, use user ID from mobile auth session
                    let userId = location.state?.authSession?.user_id;
                    if (!userId) {
                      // Fall back to regular Supabase auth for desktop users
                      userId = (await supabase.auth.getUser()).data.user?.id;
                    }
                    const { error: historyError } = await (supabase as any).rpc('insert_inventory_history_simple', {
                      organization_id: workingOrganization.id,
                      inventory_item_id: inventoryItem.id,
                      quantity: roundedQuantity,
                      event_type: 'audit',
                      check_type: 'periodic',
                      created_by: userId || null,
                      condition: null,
                      notes: `Monthly inventory check via form: ${form.name}. Exact quantity: ${newQuantity} gallons`,
                      status: 'active',
                      location: data.location || '',
                      response_data: {
                        ...data,
                        exact_quantity: newQuantity
                      }
                    });
                      
                    if (historyError) {
                      console.error('Error creating inventory history:', historyError);
                    }
                  }
                }
              } else {
                console.error('Invalid quantity value:', data[setField.id]);
              }
            }
          } else {
            // For other forms, use the standard submitForm service
            await submitForm(
              id,
              data,
              workingOrganization.id,
              submissionAssetTypeId,
              assetId,
              formType,
              freshAssetMetadata // Pass fresh metadata to the service
            );
          }
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
          workingOrganization.id,
          submissionAssetTypeId,
          assetId, // Pass the asset ID if this is from a QR code scan
          formType, // Pass the form type to determine correct event_type
          freshAssetMetadata // Pass fresh metadata to the service
        );
        
        // For inventory forms, ensure inventory is updated
        if (formType === 'inventory' && form?.form_data && assetId) {
          const formSchema = typeof form.form_data === 'string' ? JSON.parse(form.form_data) : form.form_data;
          
          // Find field with inventory_action = 'set'
          const setField = formSchema.fields?.find((field: any) => field.inventory_action === 'set');
          if (setField && data[setField.id]) {
            const newQuantity = Number(data[setField.id]);
            
            if (!isNaN(newQuantity)) {
              // Get inventory item for this asset
              const { data: inventoryItem, error: fetchError } = await supabase
                .from('inventory_items')
                .select('id')
                .eq('asset_id', assetId)
                .single();
                
              if (fetchError) {
                console.error('Error fetching inventory item:', fetchError);
              } else if (inventoryItem) {
                // Update inventory quantity (round for integer column)
                const roundedQuantity = Math.round(newQuantity);
                const { error: updateError } = await supabase
                  .from('inventory_items')
                  .update({
                    quantity: roundedQuantity, // Database expects integer
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', inventoryItem.id);
                  
                if (updateError) {
                  console.error('Error updating inventory:', updateError);
                } else {
                  // Inventory updated
                  
                  // Get current asset to preserve existing metadata (especially conversion rates)
                  const { data: currentAsset, error: assetFetchError } = await supabase
                    .from('assets')
                    .select('metadata')
                    .eq('id', assetId)
                    .single();
                  
                  if (!assetFetchError && currentAsset) {
                    // Preserve existing metadata and only update inventory-related fields
                    const preservedMetadata = (currentAsset.metadata as Record<string, any>) || {};
                    const updatedMetadata = {
                      ...preservedMetadata,
                      exact_quantity_gallons: newQuantity,
                      last_inventory_update: new Date().toISOString()
                    };
                    
                    const { error: assetUpdateError } = await supabase
                      .from('assets')
                      .update({
                        metadata: updatedMetadata
                      })
                      .eq('id', assetId);
                      
                    if (assetUpdateError) {
                      console.error('Error updating asset metadata with exact quantity:', assetUpdateError);
                    } else {
                      // Asset metadata updated while preserving conversion rates
                    }
                  }
                  
                  // Create inventory history record using RPC to avoid user_id error
                  // For mobile QR workflow, use user ID from mobile auth session
                  let userId = location.state?.authSession?.user_id;
                  if (!userId) {
                    // Fall back to regular Supabase auth for desktop users
                    userId = (await supabase.auth.getUser()).data.user?.id;
                  }
                  const { error: historyError } = await (supabase as any).rpc('insert_inventory_history_simple', {
                    organization_id: workingOrganization.id,
                    inventory_item_id: inventoryItem.id,
                    quantity: roundedQuantity,
                    event_type: 'audit',
                    check_type: 'periodic',
                    created_by: userId || null,
                    condition: null,
                    notes: `Monthly inventory check via form: ${form.name}. Exact quantity: ${newQuantity} gallons`,
                    status: 'active',
                    location: data.location || '',
                    response_data: {
                      ...data,
                      exact_quantity: newQuantity
                    }
                  });
                    
                  if (historyError) {
                    console.error('Error creating inventory history:', historyError);
                  }
                }
              }
            } else {
              console.error('Invalid quantity value:', data[setField.id]);
            }
          }
        }
      }
      
      toast({
        title: 'Form Submitted',
        description: 'Data has been recorded successfully',
      });
      
      // Clear asset cache to refresh inventory quantities
      clearAssetCacheForOrg(workingOrganization.id);
      
      // Navigate based on form type
      if (formType === 'intake') {
        navigate('/inventory');
      } else if (formType === 'inventory') {
        navigate('/inventory');
      } else if (assetId) {
        navigate(`/assets/${assetId}`);
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
    <div className={`${fromMobileQR ? 'mobile-form-container' : 'container'} py-6`}>
      <div className={`flex items-center mb-6 ${fromMobileQR ? 'px-4' : ''}`}>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className={`${fromMobileQR ? 'text-xl' : 'text-2xl'} font-bold`}>{form.name}</h1>
            {assetName && (
              <Badge variant="secondary" className="px-3 py-1">
                <Package className="h-3 w-3 mr-1" />
                {assetName}
              </Badge>
            )}
          </div>
          <p className={`text-muted-foreground ${fromMobileQR ? 'text-sm' : ''}`}>
            {assetName 
              ? `${form.description || 'Complete this form'} for ${assetName}`
              : form.description || 'Complete and submit this form'
            }
          </p>
        </div>
      </div>
      
      {assetId && (
        <Alert className={`mb-6 ${fromMobileQR ? 'mx-4' : ''}`}>
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
        <Alert className={`mb-6 ${fromMobileQR ? 'mx-4' : ''}`} variant={isEditingExisting ? "default" : "default"}>
          <Calendar className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>
              {isEditingExisting ? 'Editing Existing Monthly Inventory' : 'Creating New Inventory Entry'}
            </span>
            {existingSubmissionDate && isEditingExisting && (
              <span className={`text-sm text-muted-foreground ${fromMobileQR ? 'hidden sm:inline' : ''}`}>
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
                  className={`${fromMobileQR ? 'ml-0 mt-2 w-full sm:ml-2 sm:mt-0 sm:w-auto' : 'ml-2'}`}
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
                  className={`${fromMobileQR ? 'ml-0 mt-2 w-full sm:ml-2 sm:mt-0 sm:w-auto' : 'ml-2'}`}
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
      
      <Card className={fromMobileQR ? 'mx-4' : ''}>
        <CardContent className={`${fromMobileQR ? 'p-4' : 'p-6'}`}>
          {/* Toggle for showing calculated fields and formulas */}
          {form && form.form_data && (form.form_data as any).fields && 
           (form.form_data as any).fields.some((field: any) => field.type === 'calculated') && (
            <div className={`flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg border ${fromMobileQR ? 'flex-col gap-3 sm:flex-row sm:gap-0' : ''}`}>
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <Label htmlFor="show-formulas" className="text-sm font-medium">
                  Show Conversion & Formula Fields
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-formulas"
                  checked={showCalculatedFields}
                  onCheckedChange={setShowCalculatedFields}
                />
                {showCalculatedFields ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          )}
          
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
            showCalculatedFields={showCalculatedFields}
            isMobile={fromMobileQR}
          />
        </CardContent>
      </Card>
    </div>
  );
} 