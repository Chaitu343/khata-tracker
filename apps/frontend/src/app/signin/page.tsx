// apps/frontend/src/app/signin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";
// import { Icons } from '@/components/icons';

// NEW: Define types for our different authentication modes
type AuthMode = 'password' | 'otp' | 'forgot';

export default function SignInPage() {
  // --- STATE MANAGEMENT ---
  const [authMode, setAuthMode] = useState<AuthMode>('password'); // To switch between views
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(''); // State for the OTP input

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, user: authUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- HOOKS and EFFECTS ---
  useEffect(() => {
    if (authUser) {
      router.push('/'); // Redirect if user is already logged in
    }
    if (searchParams.get('signupSuccess')) {
      toast.success("Account created successfully! Please sign in.");
    }
  }, [authUser, router, searchParams]);
  
  // NEW: Function to reset states when switching modes
  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setOtp('');
  };


  // --- API HANDLERS ---

  // Handler for traditional password sign-in (existing logic)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/signin', { email, password });
      const { access_token, user: userData } = response.data;
      login(access_token, userData);
      toast.success("Signed in successfully!");
    } catch (err: any) {
      const message = err.response?.data?.message || 'Invalid email or password.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handler to request an OTP
  const handleRequestOtp = async () => {
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiClient.post('/auth/otp/request', { email });
      setSuccessMessage("An OTP has been sent to your email.");
      toast.success("An OTP has been sent to your email.");
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to send OTP.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handler to log in with the received OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/otp/login', { email, otp });
      const { access_token, user: userData } = response.data;
      login(access_token, userData);
      toast.success("Signed in successfully!");
    } catch (err: any)      {
      const message = err.response?.data?.message || 'Invalid or expired OTP.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handler for the forgot password flow
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      setSuccessMessage(response.data.message);
      toast.success(response.data.message);
    } catch (err: any) {
      const message = err.response?.data?.message || 'An error occurred.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };


  if (authUser) return null; // Or a loading component

  // --- RENDER LOGIC ---
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        
        {/* Password Sign-in View */}
        {authMode === 'password' && (
          <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Enter your email and password to sign in</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                </div>
                 <div className="text-right text-sm">
                   <button type="button" onClick={() => switchAuthMode('forgot')} className="font-medium text-primary hover:underline">
                     Forgot password?
                   </button>
                 </div>
                {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-center text-sm gap-2">
                <button onClick={() => switchAuthMode('otp')} className="font-medium text-primary hover:underline">
                    Sign in with OTP instead
                </button>
                <p className="text-muted-foreground">
                    Don't have an account?{' '}
                    <Link href="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
                </p>
            </CardFooter>
          </>
        )}

        {/* OTP Sign-in View */}
        {authMode === 'otp' && (
          <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">Sign In with OTP</CardTitle>
              <CardDescription>Enter your email to receive a one-time password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOtpSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-otp">Email</Label>
                  <div className="flex gap-2">
                    <Input id="email-otp" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                    <Button type="button" variant="outline" onClick={handleRequestOtp} disabled={isLoading}>
                      Send OTP
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="otp">One-Time Password</Label>
                  <Input id="otp" type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} />
                </div>
                {successMessage && <p className="text-sm text-green-600 bg-green-500/10 p-2 rounded-md">{successMessage}</p>}
                {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Sign In with OTP'}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center text-sm">
                <button onClick={() => switchAuthMode('password')} className="font-medium text-primary hover:underline">
                    Sign in with password instead
                </button>
            </CardFooter>
          </>
        )}

        {/* Forgot Password View */}
        {authMode === 'forgot' && (
           <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">Forgot Password</CardTitle>
              <CardDescription>Enter your email to receive a password reset link</CardDescription>
            </CardHeader>
            <CardContent>
               <form onSubmit={handleForgotPasswordSubmit} className="grid gap-4">
                 <div className="grid gap-2">
                   <Label htmlFor="email-forgot">Email</Label>
                   <Input id="email-forgot" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                 </div>
                 {successMessage && <p className="text-sm text-green-600 bg-green-500/10 p-2 rounded-md">{successMessage}</p>}
                 {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
                 <Button type="submit" className="w-full" disabled={isLoading}>
                   {isLoading ? 'Sending...' : 'Send Reset Link'}
                 </Button>
               </form>
             </CardContent>
             <CardFooter className="flex justify-center text-sm">
                 <button onClick={() => switchAuthMode('password')} className="font-medium text-primary hover:underline">
                     Back to Sign In
                 </button>
             </CardFooter>
           </>
        )}

      </Card>
    </div>
  );
}