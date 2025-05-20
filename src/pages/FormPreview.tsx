import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Download, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { FormRenderer } from '@/components/ui/form-renderer';
import { getFormWithRelatedData, Form, FormValidationRule, FormFieldDependency } from '@/services/formService';
import { useOrganization } from '@/hooks/useOrganization';

export default function FormPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const [form, setForm] = useState<Form | null>(null);
  const [validationRules, setValidationRules] = useState<FormValidationRule[]>([]);
  const [fieldDependencies, setFieldDependencies] = useState<FormFieldDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('preview');
  const [formData, setFormData] = useState<any>({});
  
  useEffect(() => {
    const loadForm = async () => {
      if (!id || !currentOrganization) return;
      
      try {
        setLoading(true);
        console.log(`Loading form with ID: ${id}`);
        const { form, validationRules, fieldDependencies } = await getFormWithRelatedData(id);
        
        if (form) {
          console.log('Form loaded successfully:', form);
          setForm(form);
          setValidationRules(validationRules || []);
          setFieldDependencies(fieldDependencies || []);
          
          // Pre-populate with default values if any
          const initialData: Record<string, any> = {};
          form.form_data?.fields?.forEach(field => {
            if (field.defaultValue !== undefined) {
              initialData[field.id] = field.defaultValue;
            }
          });
          setFormData(initialData);
        } else {
          console.error(`Form with ID ${id} not found`);
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
          description: 'Failed to load form data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadForm();
  }, [id, currentOrganization, toast]);
  
  const handleFormSubmit = async (data: any) => {
    console.log('Form submitted with data:', data);
    setFormData(data);
    
    toast({
      title: 'Form Submitted',
      description: 'Form data has been submitted successfully.',
    });
  };
  
  // Export form data as JSON
  const exportFormData = () => {
    const data = {
      form: form?.name,
      submittedAt: new Date().toISOString(),
      data: formData,
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form?.name.replace(/\s+/g, '_')}_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{form.name}</h1>
            <p className="text-muted-foreground">{form.description || 'Form Preview'}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportFormData}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button onClick={() => navigate(`/forms/edit/${id}`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Form
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="data">
            <Save className="h-4 w-4 mr-2" />
            Submitted Data
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview">
          <Card>
            <CardContent className="p-6">
              <FormRenderer
                form={form}
                validationRules={validationRules}
                fieldDependencies={fieldDependencies}
                onSubmit={handleFormSubmit}
                initialData={formData}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="data">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Submitted Form Data</h2>
              
              {Object.keys(formData).length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-muted rounded-md p-4 overflow-auto">
                    <pre className="text-sm">{JSON.stringify(formData, null, 2)}</pre>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={exportFormData}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No data has been submitted yet. Fill and submit the form in the Preview tab.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 