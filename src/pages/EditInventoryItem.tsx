import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { getInventoryItem, updateInventoryItem } from '@/services/inventoryService';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  quantity: z.coerce.number().int().min(0).default(0),
  location: z.string().optional(),
  category: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditInventoryItem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      barcode: '',
      quantity: 0,
      location: '',
      category: '',
    },
  });

  useEffect(() => {
    async function loadInventoryItem() {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await getInventoryItem(supabase, id);
        
        if (data) {
          // Populate form with existing data
          form.reset({
            name: data.name || '',
            description: data.description || '',
            sku: data.sku || '',
            barcode: data.barcode || '',
            quantity: data.quantity || 0,
            location: data.location || '',
            category: data.category || '',
          });
        }
      } catch (err) {
        console.error('Error loading inventory item:', err);
        setError('Failed to load inventory item');
      } finally {
        setLoading(false);
      }
    }

    loadInventoryItem();
  }, [id, supabase, form]);

  const onSubmit = async (data: FormValues) => {
    if (!id) return;
    
    try {
      setSaving(true);
      await updateInventoryItem(supabase, id, data);
      
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
      
      navigate(`/inventory/item/${id}`);
    } catch (err) {
      console.error('Error updating inventory item:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update inventory item",
      });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container py-6 max-w-2xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/inventory/item/${id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Inventory Item</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Item name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Item description" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="SKU" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Barcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="Category" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/inventory/item/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner size={16} className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}