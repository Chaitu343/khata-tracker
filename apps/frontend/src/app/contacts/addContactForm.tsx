// apps/frontend/src/components/contacts/AddContactForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AddContactFormProps {
  onContactAdded: () => void;
  onClose?: () => void;
}

export function AddContactForm({ onContactAdded, onClose }: AddContactFormProps) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false); // New state for overall form validity

  // Validate form on every input change
  useEffect(() => {
    const validate = () => {
      const newErrors: { [key: string]: string | undefined } = {};
      let isValid = true;

      if (!name.trim()) {
        newErrors.name = 'Name is required.';
        isValid = false;
      }

      const emailTrimmed = email.trim();
      const phoneTrimmed = phone.trim();

      if (emailTrimmed && !/\S+@\S+\.\S+/.test(emailTrimmed)) {
        newErrors.email = 'Please enter a valid email address.';
        isValid = false;
      }

      // Phone validation (very basic, can be enhanced with libphonenumber-js if needed here)
      // For simplicity, we'll just check if it's not empty if provided,
      // more complex validation can be added.
      // if (phoneTrimmed && !/^\+?[0-9\s-().]{7,}$/.test(phoneTrimmed)) {
      //   newErrors.phone = 'Please enter a valid phone number.';
      //   isValid = false;
      // }


      if (!emailTrimmed && !phoneTrimmed) {
        newErrors.contactMethod = 'Please provide either an email or a phone number.';
        isValid = false;
      } else {
        // Clear contactMethod error if one is provided
        newErrors.contactMethod = undefined;
      }


      setErrors(newErrors);
      setIsFormValid(isValid && Object.values(newErrors).every(err => err === undefined));
    };

    validate();
  }, [name, email, phone]); // Re-validate when these fields change

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Re-run validation on submit just in case, though useEffect should cover it
    if (!isFormValid) {
        // Force re-validation to show all errors if user clicks submit with invalid form
        const newErrors: { [key: string]: string | undefined } = {};
        if (!name.trim()) newErrors.name = 'Name is required.';
        if (email.trim() && !/\S+@\S+\.\S+/.test(email.trim())) newErrors.email = 'Please enter a valid email address.';
        if (!email.trim() && !phone.trim()) newErrors.contactMethod = 'Please provide either an email or a phone number.';
        setErrors(newErrors);

        toast.error("Please correct the errors in the form.");
        return;
    }
    if (!token) {
        toast.error("Authentication token not found. Please sign in again.");
        return;
    }
    setIsSubmitting(true);

    try {
      await apiClient.post(
        '/contacts',
        { name, email: email.trim() || undefined, phone: phone.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Contact created successfully!');
      onContactAdded();
      if (onClose) onClose();
      setName('');
      setEmail('');
      setPhone('');
      setErrors({});
    } catch (err: any) {
      console.error("Failed to create contact:", err);
      const apiError = err.response?.data?.message || "Failed to create contact.";
      setErrors(prev => ({ ...prev, api: apiError }));
      toast.error(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="dialog-name">Name</Label>
        <Input
          id="dialog-name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jane Smith"
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="dialog-email">Email</Label>
        <Input
          id="dialog-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g., jane@example.com"
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="dialog-phone">Phone</Label>
        <Input
          id="dialog-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g., +1 555-123-4567"
          className={errors.phone ? 'border-destructive' : ''}
        />
        {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
      </div>

      {errors.contactMethod && <p className="text-sm text-destructive mt-1">{errors.contactMethod}</p>}
      {errors.api && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md mt-2">{errors.api}</p>}

      <div className="flex justify-end space-x-2 pt-2">
        {onClose && <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting || !isFormValid}> {/* Disable based on form validity */}
          {isSubmitting ? 'Saving...' : 'Save Contact'}
        </Button>
      </div>
    </form>
  );
}