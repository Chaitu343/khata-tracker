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
// import { Icons } from '@/components/icons';
import { toast } from "sonner"

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user: authUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (authUser) {
      router.push('/');
    }
    if (searchParams.get('signupSuccess')) {
      setSuccessMessage('Account created successfully! Please sign in.');
      toast.success("Account created successfully! Please sign in.") 
    }
  }, [authUser, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/signin', {
        email,
        password,
      });
      const { access_token, user: userData } = response.data;
      login(access_token, userData);
    } catch (err: any) {
      const messages = err.response?.data?.message;
      setError(Array.isArray(messages) ? messages.join(', ') : messages || 'Invalid email or password.');
      toast.error(Array.isArray(messages) ? messages.join(', ') : messages || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authUser) return null; // Or a loading component

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Enter your email and password to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {successMessage && (
            <p className="text-sm text-green-600 bg-green-500/10 p-2 rounded-md">{successMessage}</p>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && (
               <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && (
                // <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                <span className="mr-2">Signing in...</span>
              )}
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <p className="text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}