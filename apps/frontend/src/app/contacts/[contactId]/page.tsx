// apps/frontend/src/app/contacts/[contactId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, PlusCircle, FileText, Pencil, Trash2, CheckCircle, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AddTransactionForm, TransactionTypeEnum } from "./addTransactionForm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContactForm, ContactFormData } from "@/components/contacts/ContactForm";

interface ContactWithBalance {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  netBalance: number;
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
  const { token, isLoading: authLoading } = useAuth();
  const params = useParams();
  const contactId = params.contactId as string;
  const router = useRouter();

  const [contact, setContact] = useState<ContactWithBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [settleUpValues, setSettleUpValues] = useState<{ amount: string; type: TransactionTypeEnum; notes: string } | null>(null);

  // Edit Contact State
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/signin");
    }
  }, [authLoading, token, router]);


  const fetchPageData = useCallback(async () => {
    if (!token || !contactId) {
      setIsLoadingPage(false);
        return;
    }

    setIsLoadingPage(true);
    setError(null);

    try {
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
  }, [fetchPageData]);

  const handleTransactionAdded = () => {
    setIsAddTransactionDialogOpen(false);
    setEditingTransaction(null);
    setSettleUpValues(null);
    fetchPageData();
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsAddTransactionDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsAddTransactionDialogOpen(false);
    setEditingTransaction(null);
    setSettleUpValues(null);
  };

  const handleSettleUp = () => {
    if (!contact) return;
    const balance = contact.netBalance;
    if (Math.abs(balance) < 0.01) {
      toast.info("You are already settled up!");
      return;
    }
    // If balance > 0, they owe you. You need to GET money.
    // If balance < 0, you owe them. You need to GIVE money.
    const type = balance > 0 ? TransactionTypeEnum.GOT : TransactionTypeEnum.GAVE;
    setSettleUpValues({
      amount: Math.abs(balance).toString(),
      type: type,
      notes: "Settling up balance"
    });
    setIsAddTransactionDialogOpen(true);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      await apiClient.delete(`/transactions/${transactionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Transaction deleted successfully");
      fetchPageData();
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const handleUpdateContact = async (data: ContactFormData) => {
    if (!contact) return;
    try {
      await apiClient.patch(`/contacts/${contact.id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Contact updated successfully");
      setIsEditContactDialogOpen(false);
      fetchPageData();
    } catch (error: any) {
      console.error("Failed to update contact:", error);
      toast.error(error.response?.data?.message || "Failed to update contact");
    }
  };

  const handleDeleteContact = async () => {
    if (!contact) return;
    if (!confirm(`Are you sure you want to delete ${contact.name}? This cannot be undone.`)) return;

    try {
      await apiClient.delete(`/contacts/${contact.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Contact deleted successfully");
      router.push("/contacts");
    } catch (error: any) {
      console.error("Failed to delete contact:", error);
      toast.error(error.response?.data?.message || "Failed to delete contact");
    }
  };


  if (authLoading || isLoadingPage) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[calc(100vh-theme(space.16))]">
        <p className="text-muted-foreground">Loading contact information...</p>
      </div>
    );
  }

  if (error && !contact) {
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

  if (!contact) {
    return <div className="p-6 text-center">Contact not found or could not be loaded.</div>;
  }

  const netBalance = contact.netBalance || 0;
  const contactName = contact.name || "This Contact";

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      {/* Header Section */}
      <div className="mb-6">
        <Link
          href="/contacts"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Contacts
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{contact.name}</h1>
              <div className="flex gap-3 text-sm text-muted-foreground">
                {contact.email && <span>{contact.email}</span>}
                {contact.phone && <span>{contact.phone}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right mr-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Net Balance</p>
              <p className={`text-2xl font-bold ${netBalance > 0 ? "text-green-600" : netBalance < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                {netBalance > 0 ? "+" : netBalance < 0 ? "-" : ""}₹{Math.abs(netBalance).toFixed(2)}
              </p>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditContactDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteContact}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
              <Button onClick={handleSettleUp} variant="default" size="sm" className="gap-2" disabled={Math.abs(netBalance) < 0.01}>
                <CheckCircle className="h-4 w-4" />
                Settle Up
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex items-center gap-2">
              <Button onClick={handleSettleUp} variant="default" size="sm" className="gap-2" disabled={Math.abs(netBalance) < 0.01}>
                <CheckCircle className="h-4 w-4" />
                Settle
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditContactDialogOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit Contact
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteContact} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Contact
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditContactDialogOpen} onOpenChange={setIsEditContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact details.</DialogDescription>
          </DialogHeader>
          <ContactForm
            initialData={{
              name: contact.name,
              email: contact.email || '',
              phone: contact.phone || ''
            }}
            onSubmit={handleUpdateContact}
            onCancel={() => setIsEditContactDialogOpen(false)}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog
        open={isAddTransactionDialogOpen}
        onOpenChange={(open) => {
          setIsAddTransactionDialogOpen(open);
          if (!open) {
            setEditingTransaction(null);
            setSettleUpValues(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Edit Transaction' : settleUpValues ? 'Settle Up' : `Add Transaction`}</DialogTitle>
            <DialogDescription>{editingTransaction ? 'Update transaction details.' : settleUpValues ? 'Clear the outstanding balance.' : 'Record a new transaction.'}</DialogDescription>
          </DialogHeader>
          <AddTransactionForm
            contactId={contactId}
            initialData={editingTransaction}
            defaultValues={settleUpValues || undefined}
            onTransactionAdded={handleTransactionAdded}
            onClose={handleDialogClose}
          />
        </DialogContent>
      </Dialog>


      {/* Transaction History (Chat Style) */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Transaction History</h2>
          <Button onClick={() => { setEditingTransaction(null); setIsAddTransactionDialogOpen(true); }} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>

        {transactions.length === 0 && !isLoadingPage ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">No transactions yet. Start adding some!</p>
          </div>
        ) : (
          <div className="space-y-4 pb-12">
            {transactions.map((tx) => {
              const isGave = tx.type === "GAVE"; // You Gave -> Sent Message (Right)
              return (
                <div key={tx.id} className={`flex w-full ${isGave ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 ${isGave ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'}`}>
                    <div className="flex justify-between items-start gap-4 mb-1">
                      <span className="font-bold text-lg">
                        ₹{tx.amount.toFixed(2)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={`h-6 w-6 -mr-2 -mt-2 ${isGave ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10' : 'text-muted-foreground hover:text-foreground'}`}>
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isGave ? "end" : "start"}>
                          <DropdownMenuItem onClick={() => handleEditTransaction(tx)}>
                            <Pencil className="mr-2 h-3 w-3" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteTransaction(tx.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-3 w-3" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className={`text-sm mb-2 ${isGave ? 'text-primary-foreground/90' : 'text-foreground/90'}`}>
                      {isGave ? `You gave ${contactName}` : `${contactName} gave you`}
                    </p>

                    {tx.notes && (
                      <p className={`text-sm italic mb-2 ${isGave ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        "{tx.notes}"
                      </p>
                    )}

                    <div className={`flex items-center justify-between gap-4 text-xs ${isGave ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      <span>{format(new Date(tx.date), "MMM d, h:mm a")}</span>
                      {tx.proofUrl && (
                        <a href={tx.proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline">
                          <FileText className="h-3 w-3 mr-1" /> Proof
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
      </div>
    </div>
  );
}