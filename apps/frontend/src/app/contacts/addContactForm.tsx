// apps/frontend/src/components/contacts/AddContactForm.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import { ContactForm, ContactFormData } from '@/components/contacts/ContactForm';

interface AddContactFormProps {
  onContactAdded: () => void;
  onClose?: () => void;
}

export function AddContactForm({ onContactAdded, onClose }: AddContactFormProps) {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateContact = async (data: ContactFormData) => {
    if (!token) {
      toast.error("Authentication token not found. Please sign in again.");
      return;
    }
    setIsSubmitting(true);

    try {
      await apiClient.post(
        '/contacts',
        {
          name: data.name,
          email: data.email.trim() || undefined,
          phone: data.phone.trim() || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Contact created successfully!');
      onContactAdded();
      if (onClose) onClose();
    } catch (err: any) {
      console.error("Failed to create contact:", err);
      const apiError = err.response?.data?.message || "Failed to create contact.";
      toast.error(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ContactForm
      onSubmit={handleCreateContact}
      onCancel={onClose}
      submitLabel="Save Contact"
      isSubmitting={isSubmitting}
    />
  );
}