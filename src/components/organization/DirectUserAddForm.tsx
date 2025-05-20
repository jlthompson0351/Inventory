import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail, Phone, User } from 'lucide-react';

// Schema for email user creation
const emailUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  role: z.enum(['admin', 'member', 'viewer']),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

// Schema for phone user creation
const phoneUserSchema = z.object({
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  role: z.enum(['admin', 'member', 'viewer']),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

// Schema for username user creation
const usernameUserSchema = z.object({
  username: z.string().min(4, { message: "Username must be at least 4 characters" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  role: z.enum(['admin', 'member', 'viewer']),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type EmailUserFormValues = z.infer<typeof emailUserSchema>;
type PhoneUserFormValues = z.infer<typeof phoneUserSchema>;
type UsernameUserFormValues = z.infer<typeof usernameUserSchema>;

interface DirectUserAddFormProps {
  organizationId: string;
  onUserAdded: () => void;
}

const DirectUserAddForm: React.FC<DirectUserAddFormProps> = ({ organizationId, onUserAdded }) => {
  const [activeTab, setActiveTab] = useState<string>('email');
  const [loading, setLoading] = useState(false);

  // Email form
  const emailForm = useForm<EmailUserFormValues>({
    resolver: zodResolver(emailUserSchema),
    defaultValues: {
      email: '',
      name: '',
      role: 'member',
      password: '',
    },
  });

  // Phone form
  const phoneForm = useForm<PhoneUserFormValues>({
    resolver: zodResolver(phoneUserSchema),
    defaultValues: {
      phone: '',
      name: '',
      role: 'member',
      password: '',
    },
  });

  // Username form
  const usernameForm = useForm<UsernameUserFormValues>({
    resolver: zodResolver(usernameUserSchema),
    defaultValues: {
      username: '',
      name: '',
      role: 'member',
      password: '',
    },
  });

  const createUserWithEmail = async (data: EmailUserFormValues) => {
    setLoading(true);
    try {
      // First create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name: data.name }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Then add the user to the organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: authData.user.id,
          organization_id: organizationId,
          role: data.role,
          is_primary: false
        });

      if (memberError) throw memberError;

      toast.success(`User ${data.email} created and added to organization`);
      emailForm.reset();
      onUserAdded();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Note: Phone authentication requires additional setup with a third-party SMS provider
  const createUserWithPhone = async (data: PhoneUserFormValues) => {
    setLoading(true);
    try {
      toast.error("Phone authentication requires additional setup with a third-party SMS provider");
      // Implementation would go here once SMS provider is set up
    } catch (error: any) {
      console.error('Error creating user with phone:', error);
      toast.error(`Failed to create user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createUserWithUsername = async (data: UsernameUserFormValues) => {
    setLoading(true);
    try {
      // Generate a random email since Supabase requires an email
      const randomEmail = `${data.username}_${Math.random().toString(36).substring(2)}@example.com`;
      
      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: randomEmail,
        password: data.password,
        email_confirm: true,
        user_metadata: { 
          full_name: data.name,
          username: data.username,
          auth_method: 'username'
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Add the user to the organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: authData.user.id,
          organization_id: organizationId,
          role: data.role,
          is_primary: false
        });

      if (memberError) throw memberError;

      toast.success(`User ${data.username} created and added to organization`);
      usernameForm.reset();
      onUserAdded();
    } catch (error: any) {
      console.error('Error creating user with username:', error);
      toast.error(`Failed to create user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add User Directly</CardTitle>
        <CardDescription>Create and add a user to your organization without sending an invitation.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone">
              <Phone className="h-4 w-4 mr-2" />
              Phone
            </TabsTrigger>
            <TabsTrigger value="username">
              <User className="h-4 w-4 mr-2" />
              Username
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email">
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(createUserWithEmail)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={emailForm.control}
                  name="name"
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
                  control={emailForm.control}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={emailForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormDescription>
                        User will use this to log in
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
          </TabsContent>

          {/* Phone Tab */}
          <TabsContent value="phone">
            <Form {...phoneForm}>
              <form onSubmit={phoneForm.handleSubmit(createUserWithPhone)} className="space-y-4">
                <FormField
                  control={phoneForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={phoneForm.control}
                  name="name"
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
                  control={phoneForm.control}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={phoneForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormDescription>
                        User will use this to log in
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
          </TabsContent>

          {/* Username Tab */}
          <TabsContent value="username">
            <Form {...usernameForm}>
              <form onSubmit={usernameForm.handleSubmit(createUserWithUsername)} className="space-y-4">
                <FormField
                  control={usernameForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={usernameForm.control}
                  name="name"
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
                  control={usernameForm.control}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={usernameForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormDescription>
                        User will use this to log in
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
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Added users will receive automatic access to the organization
        </p>
      </CardFooter>
    </Card>
  );
};

export default DirectUserAddForm; 