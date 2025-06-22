// apps/frontend/src/app/contacts/[contactId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext"; // Assuming this is your context provider
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, PlusCircle, FileText, ExternalLink, UserCircle, Mail, Phone } from "lucide-react"; // Added UserCircle etc.
import { format } from "date-fns";
import { toast } from "sonner";
import { AddTransactionForm } from "./addTransactionForm"; // Ensure this path is correct

// Interface for Contact data fetched from backend (includes netBalance)
interface ContactWithBalance {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  netBalance: number; // Expect this from /contacts/:id
  // Add any other fields your /contacts/:id endpoint returns
}

interface Transaction {
  id: string;
  amount: number;
  type: "GAVE" | "GOT";
  notes?: string;
  proofUrl?: string;
  date: string;
}

export default function ContactDetailPage() {
  const { token, isLoading: authLoading } = useAuth(); // Removed selectedContact related hooks from here
  const params = useParams();
  const contactId = params.contactId as string;
  const router = useRouter();

  // Local state for this page's data
  const [contact, setContact] = useState<ContactWithBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true); // Single loading state for initial page load
  const [error, setError] = useState<string | null>(null);
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/signin");
    }
  }, [authLoading, token, router]);


  const fetchPageData = useCallback(async () => {
    if (!token || !contactId) {
        setIsLoadingPage(false); // Stop loading if no token/id
        return;
    }

    setIsLoadingPage(true);
    setError(null);

    try {
      // Fetch contact details and transactions in parallel
      const [contactRes, transRes] = await Promise.all([
        apiClient.get(`/contacts/${contactId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/transactions?contactId=${contactId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setContact(contactRes.data);
      setTransactions(transRes.data);

    } catch (err: any) {
      console.error("Failed to fetch page data:", err);
      const errorMessage = err.response?.data?.message || "Failed to load contact information.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingPage(false);
    }
  }, [token, contactId]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]); // This will run once when token/contactId are available and on subsequent calls to fetchPageData


  const handleTransactionAdded = () => {
    setIsAddTransactionDialogOpen(false);
    // Re-fetch all page data to ensure contact's netBalance and transaction list are updated
    fetchPageData();
  };

  if (authLoading || isLoadingPage) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[calc(100vh-theme(space.16))]"> {/* Adjust 16 based on navbar height */}
        {/* You can add a spinner component here */}
        <p className="text-muted-foreground">Loading contact information...</p>
      </div>
    );
  }

  if (error && !contact) { // If there was an error and no contact data could be loaded
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-destructive">{error}</p>
        <Link href="/contacts">
          <Button variant="link" className="mt-4">
            Go back to Contacts
          </Button>
        </Link>
      </div>
    );
  }

  if (!contact) { // Fallback if no contact and no error (should ideally be covered by isLoading or error state)
    return <div className="p-6 text-center">Contact not found or could not be loaded.</div>;
  }

  // Use the contact data from the local 'contact' state
  const netBalance = contact.netBalance || 0;
  const contactName = contact.name || "This Contact"; // Fallback name

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header Section */}
      <div className="mb-8">
        <Link
          href="/contacts"
          className="inline-flex items-center text-sm text-primary hover:underline mb-4 group"
        >
          <ArrowLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Contacts
        </Link>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <UserCircle className="h-16 w-16 text-muted-foreground" /> {/* Placeholder Icon */}
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{contact.name}</h1>
                        <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                            {contact.email && (
                                <div className="flex items-center">
                                    <Mail className="mr-2 h-4 w-4 flex-shrink-0"/>
                                    <span>{contact.email}</span>
                                </div>
                            )}
                            {contact.phone && (
                                <div className="flex items-center">
                                    <Phone className="mr-2 h-4 w-4 flex-shrink-0"/>
                                    <span>{contact.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-left md:text-right w-full md:w-auto mt-4 md:mt-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Balance</p>
                    <p
                    className={`text-3xl font-bold ${
                        netBalance > 0 ? "text-green-600" : netBalance < 0 ? "text-red-500" : "text-foreground"
                    }`}
                    >
                    {netBalance > 0 ? "+" : netBalance < 0 ? "-" : ""}₹{Math.abs(netBalance).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                    {netBalance > 0 ? "Owes you" : netBalance < 0 ? "You owe" : "Settled up"}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Add Transaction Button */}
      <div className="mb-6">
        <Dialog
            open={isAddTransactionDialogOpen}
            onOpenChange={setIsAddTransactionDialogOpen}
        >
            <DialogTrigger asChild>
            <Button
                onClick={() => setIsAddTransactionDialogOpen(true)}
                className="w-full sm:w-auto"
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Add Transaction for {contactName}</DialogTitle>
                <DialogDescription>Record a payment or a new amount owed.</DialogDescription>
            </DialogHeader>
            <AddTransactionForm
                contactId={contactId}
                onTransactionAdded={handleTransactionAdded}
                onClose={() => setIsAddTransactionDialogOpen(false)}
            />
            </DialogContent>
        </Dialog>
      </div>


      {/* Transaction History Section */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          {transactions.length === 0 && !isLoadingPage && (
            <CardDescription>No transactions recorded yet for {contactName}.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingPage && transactions.length === 0 && ( // Show loading only if transactions aren't there yet
            <p className="text-muted-foreground text-center py-4">Loading transactions...</p>
          )}
          {/* Removed the !isLoadingTransactions condition for no transactions message, handled in CardDescription */}
          {transactions.length > 0 && (
            <ul className="space-y-3">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-background"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="flex-grow">
                      <p className={`font-semibold text-lg ${tx.type === "GAVE" ? "text-red-600" : "text-green-500"}`}>
                        {tx.type === "GAVE" ? `You Gave ${contactName}` : `${contactName} Gave You`}
                      </p>
                      <p className="text-xs text-muted-foreground mb-1">
                        {format(new Date(tx.date), "MMM dd, yyyy  ·  hh:mm a")}
                      </p>
                      {tx.notes && (
                        <p className="text-sm text-muted-foreground italic mt-1">“{tx.notes}”</p>
                      )}
                    </div>
                    <div className="text-left sm:text-right mt-2 sm:mt-0 flex-shrink-0">
                        <p className={`text-xl font-bold ${tx.type === "GAVE" ? "text-red-600" : "text-green-500"}`}>
                            {tx.type === "GAVE" ? "-" : "+"}₹{tx.amount.toFixed(2)}
                        </p>
                        {tx.proofUrl && (
                            <a
                                href={tx.proofUrl} target="_blank" rel="noopener noreferrer"
                                className="mt-1 text-xs text-primary hover:underline inline-flex items-center"
                            >
                                <FileText className="mr-1 h-3 w-3" /> View Proof
                                <ExternalLink className="ml-1 h-3 w-3 opacity-70" />
                            </a>
                        )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}