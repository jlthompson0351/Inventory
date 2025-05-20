import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/ui/spinner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string>('CHECKING');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check initial auth state on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.log("Auth check on Login page:", data?.session ? "LOGGED_IN" : "LOGGED_OUT");
        setAuthStatus(data?.session ? "LOGGED_IN" : "LOGGED_OUT");
        
        // If already logged in, redirect to dashboard
        if (data.session) {
          navigate('/');
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setAuthStatus("ERROR");
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, !!session);
      setAuthStatus(session ? "LOGGED_IN" : "LOGGED_OUT");
      
      if (event === 'SIGNED_IN' && session) {
        toast({
          title: 'Logged In',
          description: 'Successfully signed in!',
        });
        navigate('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Attempting login with:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Supabase login error:", error);
        throw error;
      }

      console.log("Login successful, user:", data?.user?.id);
      
      if (data?.user) {
        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });
        // The navigation will happen via the auth state change listener
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'An error occurred during login');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid email or password',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    const demoEmail = 'demo@example.com';
    const demoPass = 'demo12345';
    
    setEmail(demoEmail);
    setPassword(demoPass);
    
    // Instead of using setTimeout, let's manually trigger login
    setLoading(true);
    try {
      console.log("Attempting demo login with:", demoEmail);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPass,
      });
      
      if (error) {
        throw error;
      }
      
      console.log("Demo login successful, user:", data?.user?.id);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      
    } catch (error: any) {
      console.error('Demo login error:', error);
      setError(error.message || 'An error occurred during login');
      toast({
        variant: 'destructive',
        title: 'Demo Login Failed',
        description: `Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordRequest = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email address first',
      });
      return;
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your inbox for a password reset link',
      });
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Reset Request Failed',
        description: error.message,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Welcome to BarcodEx</CardTitle>
          <CardDescription>
            Enter your credentials to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form id="login-form" onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  variant="link"
                  className="p-0 text-xs text-muted-foreground h-auto"
                  type="button"
                  onClick={resetPasswordRequest}
                >
                  Forgot password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center">
                  <Spinner className="mr-2" size="sm" />
                  Signing in...
                </div>
              ) : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <Spinner className="mr-2" size="sm" />
                Loading demo...
              </div>
            ) : 'Use Demo Account'}
          </Button>
          <p className="text-center text-sm text-muted-foreground pt-2">
            Don't have an account?{' '}
            <Button
              variant="link"
              className="p-0 text-primary h-auto"
              type="button"
              onClick={() => toast({
                title: "Registration",
                description: "Contact your administrator to create an account."
              })}
            >
              Contact Admin
            </Button>
          </p>
        </CardFooter>
      </Card>
      
      {/* Debug information (collapsed by default) */}
      <details className="fixed bottom-4 left-4 text-xs bg-muted/80 p-2 rounded border text-muted-foreground">
        <summary>Debug Info</summary>
        <div className="mt-2 space-y-1">
          <p>Login component mounted</p>
          <p>Auth state: {authStatus}</p>
          <p>Project ID: kxcubbibhofdvporfarj (omni)</p>
          <div className="mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs h-6" 
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                  toast({ title: "Signed out for testing" });
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Test Sign Out
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
};

export default Login;
