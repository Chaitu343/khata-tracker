// apps/frontend/src/app/signup/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // We'll add this
import apiClient from '@/lib/api';
import { toast } from "sonner";
import { parsePhoneNumberFromString, AsYouType, CountryCode } from 'libphonenumber-js';

// A small list of common country codes. You can expand this or fetch dynamically.
const commonCountryCodes: { code: CountryCode; name: string; dialCode: string }[] = [
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  // Add more as needed
];


export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode | string>(commonCountryCodes[3]?.code || 'IN'); // Default to India or first in list
  const [phoneNumber, setPhoneNumber] = useState(''); // Local part of the number

  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // For as-you-type formatting
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
  const asYouType = new AsYouType(countryCode as CountryCode);

  useEffect(() => {
    // Reset asYouType formatter when country code changes
    asYouType.reset();
    setFormattedPhoneNumber(asYouType.input(phoneNumber));
  }, [countryCode, phoneNumber]);


  const validateForm = () => {
    const newErrors: { [key: string]: string | undefined } = {};
    if (!name.trim()) newErrors.name = 'Name is required.';
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid.';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    // Phone number validation (optional)
    if (phoneNumber.trim()) { // Only validate if a number is entered
        const fullNumber = `${commonCountryCodes.find(c => c.code === countryCode)?.dialCode || ''}${phoneNumber}`;
        const parsedPhoneNumber = parsePhoneNumberFromString(fullNumber, countryCode as CountryCode);
        if (!parsedPhoneNumber || !parsedPhoneNumber.isValid()) {
            newErrors.phoneNumber = 'Invalid phone number for the selected country.';
        }
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Allow only digits and basic formatting characters if needed, or let asYouType handle it
    setPhoneNumber(rawValue); // Store the raw local number
    // asYouType.reset(); // Reset before new input if not relying on continuous input
    // setFormattedPhoneNumber(asYouType.input(rawValue));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }
    setIsLoading(true);

    let fullPhoneNumberForAPI = '';
    if (phoneNumber.trim() && countryCode) {
      const parsed = parsePhoneNumberFromString(phoneNumber, countryCode as CountryCode);
      if (parsed && parsed.isValid()) {
        fullPhoneNumberForAPI = parsed.format('E.164'); // e.g., +12133734253
      } else {
        // Fallback to sending raw input if parsing fails but was entered
         const dialCode = commonCountryCodes.find(c => c.code === countryCode)?.dialCode || '';
         fullPhoneNumberForAPI = `${dialCode}${phoneNumber.replace(/\D/g, '')}`;
      }
    }


    try {
      await apiClient.post('/auth/signup', {
        name,
        email,
        password,
        phoneNo: fullPhoneNumberForAPI || undefined, // Send E.164 format or undefined
      });
      toast.success("Account created successfully!");
      router.push('/signin?signupSuccess=true');
    } catch (err: any) {
      const messages = err.response?.data?.message;
      const errorMessage = Array.isArray(messages) ? messages.join(', ') : messages || 'Signup failed. Please try again.';
      setErrors(prev => ({ ...prev, api: errorMessage }));
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleSubmit} className="grid gap-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name" type="text" placeholder="John Doe" required
                value={name} onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" placeholder="m@example.com" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* Phone Number with Country Code */}
            <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                <div className="flex items-center gap-2">
                    <Select
                        value={countryCode}
                        onValueChange={(value) => setCountryCode(value as CountryCode)}
                        disabled={isLoading}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Country Code" />
                        </SelectTrigger>
                        <SelectContent>
                            {commonCountryCodes.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                    {country.dialCode} ({country.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="e.g., 5551234567"
                        value={phoneNumber} // Use raw phoneNumber for input field
                        onChange={handlePhoneNumberChange}
                        disabled={isLoading}
                        className="flex-1"
                    />
                </div>
                {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber}</p>}
            </div>


            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password" type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword" type="password" required
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>


            {errors.api && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{errors.api}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && (
                <span className="mr-2">Creating account...</span>
              )}
              Create account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <Link href="/signin" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}