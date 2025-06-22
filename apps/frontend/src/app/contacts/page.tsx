// apps/frontend/src/app/contacts/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, User, Mail, Phone } from 'lucide-react';
// No longer need Link from next/link for '/contacts/new'
import { useRouter } from 'next/navigation';
import { AddContactForm } from './addContactForm';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

export default function ContactsPage() {
  const { token, isLoading: authLoading, user: authUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/signin');
    }
  }, [authLoading, token, router]);

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContacts(response.data);
    } catch (err: any) {
      console.error("Failed to fetch contacts:", err);
      setError(err.response?.data?.message || "Failed to load contacts.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);


  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);


  const handleContactAdded = () => {
    setIsAddContactDialogOpen(false); // Close the dialog
    fetchContacts(); // Refresh the contact list
  };


  if (authLoading || (isLoading && contacts.length === 0 && !error)) {
    return <div className="p-4 text-center">Loading contacts...</div>;
  }

  if (!authUser) {
      return <div className="p-4 text-center">Please sign in to view contacts.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold">Your Contacts</h1>
        <div className="flex gap-2">
          <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddContactDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Enter the details for your new contact. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <AddContactForm
                onContactAdded={handleContactAdded}
                onClose={() => setIsAddContactDialogOpen(false)}
              />
              {/* Footer can be part of the form now, or here if needed */}
              {/* <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
              </DialogFooter> */}
            </DialogContent>
          </Dialog>
          {/* Button for Google Import - to be implemented later */}
        </div>
      </div>

      {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md mb-4">{error}</p>}

      {isLoading && contacts.length === 0 && <p>Loading...</p>}
      {!isLoading && contacts.length === 0 && !error && (
        <div className="text-center py-10">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new contact.</p>
        </div>
      )}

      {contacts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardHeader>
                <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5 text-primary" />
                    {contact.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {contact.email && (
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center">
                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}