import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';

// Schema for user creation
const userSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  full_name: z.string().min(2, { message: "Full name must be at least 2 characters" }),
  role: z.enum(['admin', 'member', 'viewer']),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type UserFormValues = z.infer<typeof userSchema>;

interface DirectUserAddFormProps {
  organizationId: string;
  onUserAdded: () => void;
}

const DirectUserAddForm: React.FC<DirectUserAddFormProps> = ({ organizationId, onUserAdded }) => {
  const [loading, setLoading] = useState(false);
  
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      full_name: '',
      password: '',
      role: 'member',
    },
  });

  const onSubmit = async (values: z.infer<typeof userSchema>) => {
    setLoading(true);
    try {
      const payload = {
        email: values.email,
        password: values.password,
        fullName: values.full_name,
        role: values.role,
        organizationId: organizationId,
      };

      // Calling admin-create-user edge function

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: payload,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Edge Function returned a non-2xx status code: ${error.message}`);
      }

      // User created successfully
      toast.success('User created successfully!');
      form.reset();
      onUserAdded();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.error('Error creating user:', errorMessage);
      toast.error(`Failed to create user: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New User Directly</CardTitle>
        <CardDescription>
          Create a new user and add them to the organization instantly.
          They will be required to change their password on first login.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="user@example.com" 
                      type="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Admin: Full access, Member: Standard access, Viewer: Read-only access
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormDescription>
                    User will be required to change this password on first login
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add User
            </Button>
          </form>
        </Form>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> The new user will receive immediate access and must change their password on first login.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectUserAddForm; 