import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  ClipboardCheck, 
  QrCode,
  Calculator 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { getFormWithRelatedData } from "@/services/formService";
import { submitForm } from "@/services/formSubmissionService";
import { applyAssetCalculationFormulas } from "@/services/inventoryService";
import { FormRenderer } from "@/components/ui/form-renderer";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { applyFormulaMappings } from '@/services/formulaMappingService';

export default function SubmitForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { currentOrganization } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [validationRules, setValidationRules] = useState<any[]>([]);
  const [fieldDependencies, setFieldDependencies] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasFormulaFields, setHasFormulaFields] = useState(false);
  
  // Retrieve QR code scan context if available
  const assetId = location.state?.assetId;
  const assetName = location.state?.assetName;
  const assetTypeId = location.state?.assetTypeId;
  const formType = location.state?.formType || 'generic';
  const prefillData = location.state?.prefillData || {};
  const calculationFormulas = location.state?.calculationFormulas || {};
  
  useEffect(() => {
    const loadForm = async () => {
      if (!id || !currentOrganization) return;
      
      try {
        setLoading(true);
        const { form, validationRules, fieldDependencies } = await getFormWithRelatedData(id);
        
        if (form) {
          setForm(form);
          setValidationRules(validationRules || []);
          setFieldDependencies(fieldDependencies || []);
          
          // Initialize with default values from form
          const initialData: Record<string, any> = {};
          form.form_data?.fields?.forEach(field => {
            if (field.defaultValue !== undefined) {
              initialData[field.id] = field.defaultValue;
            }
          });
          
          // Merge with prefill data from QR code scan if available
          let mergedData = { ...initialData, ...prefillData };
          
          // Fetch asset metadata if we have an assetId
          let assetMetadata = {};
          if (assetId) {
            try {
              const { data: assetData, error: assetError } = await supabase
                .from('assets')
                .select('*, asset_types(*)')
                .eq('id', assetId)
                .single();
                
              if (!assetError && assetData) {
                assetMetadata = assetData.metadata || {};
                
                // Apply formula mappings if we have an asset type
                if (assetData.asset_type_id) {
                  mergedData = await applyFormulaMappings(
                    mergedData,
                    assetData.asset_type_id,
                    assetMetadata
                  );
                }
              }
            } catch (assetError) {
              console.error('Error fetching asset data:', assetError);
            }
          }
          
          // Apply calculation formulas if available
          if (Object.keys(calculationFormulas).length > 0) {
            setHasFormulaFields(true);
            try {
              // Process form data with calculation formulas and asset metadata
              const processedData = await applyAssetCalculationFormulas(
                supabase,
                mergedData,
                calculationFormulas,
                assetMetadata
              );
              
              if (processedData) {
                mergedData = processedData;
              }
            } catch (formulaError) {
              console.error('Error applying calculation formulas:', formulaError);
            }
          }
          
          setFormData(mergedData);
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
  }, [id, currentOrganization, prefillData, calculationFormulas, assetId]);
  
  const handleFormSubmit = async (data: any) => {
    if (!currentOrganization || !id) return;
    
    try {
      setSubmitting(true);
      
      // Get asset type ID from prefill data or form configuration
      const assetTypeId = prefillData.asset_type_id || form.asset_type_id;
      
      const result = await submitForm(
        id,
        data,
        currentOrganization.id,
        assetTypeId,
        assetId // Pass the asset ID if this is from a QR code scan
      );
      
      toast({
        title: 'Form Submitted',
        description: 'Data has been recorded successfully',
      });
      
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
        title: 'Submission Failed',
        description: 'There was an error submitting the form',
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
          />
        </CardContent>
      </Card>
    </div>
  );
} 