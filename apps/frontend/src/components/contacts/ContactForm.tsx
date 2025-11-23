// apps/frontend/src/components/contacts/ContactForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
}

interface ContactFormProps {
  initialData?: ContactFormData;
  onSubmit: (data: ContactFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function ContactForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  isSubmitting = false,
}: ContactFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      setPhone(initialData.phone);
    }
  }, [initialData]);

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

      if (!emailTrimmed && !phoneTrimmed) {
        newErrors.contactMethod = 'Please provide either an email or a phone number.';
        isValid = false;
      }

      setErrors(newErrors);
      setIsFormValid(isValid && Object.values(newErrors).every((err) => err === undefined));
    };

    validate();
  }, [name, email, phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
        toast.error("Please correct the errors in the form.");
        return;
    }
    
    await onSubmit({ name, email, phone });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="contact-name">Name</Label>
        <Input
          id="contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jane Smith"
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g., jane@example.com"
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="contact-phone">Phone</Label>
        <Input
          id="contact-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g., +1 555-123-4567"
          className={errors.phone ? 'border-destructive' : ''}
        />
        {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
      </div>

      {errors.contactMethod && <p className="text-sm text-destructive mt-1">{errors.contactMethod}</p>}

      <div className="flex justify-end space-x-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !isFormValid}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
