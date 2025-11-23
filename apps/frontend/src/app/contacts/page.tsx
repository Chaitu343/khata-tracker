// apps/frontend/src/app/contacts/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // For search
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  User,
  Mail,
  Phone,
  Search,
  Edit2,
  Trash2,
  MoreHorizontal,
  Trash,
  ArrowUpDown,
} from "lucide-react"; // Added Search, Edit2, Trash2
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"; // For actions
import { AddContactForm } from "./addContactForm";
import { toast } from "sonner";
import { FileUp } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
  netBalance?: number;
}

type SortOption = "name-asc" | "owed-desc" | "owe-desc";

export default function ContactsPage() {
  const {
    token,
    isLoading: authLoading,
    user: authUser,
    setContactsList,
    setSelectedContact,
  } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc"); // Sorting state
  const [isImporting, setIsImporting] = useState(false);
  const importFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/signin");
    }
  }, [authLoading, token, router]);

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const [contactsRes, transactionsRes] = await Promise.all([
        apiClient.get("/contacts", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get("/transactions", { // Attempt to fetch all transactions
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: [] })) // Fallback to empty if endpoint doesn't exist/fails
      ]);

      setContacts(contactsRes.data); // Raw data, sorting happens in useMemo
      setContactsList(
        contactsRes.data.map(
          (c: { id: string; name: string; email: string; phone: string }) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
          })
        )
      );

      // Process recent transactions
      if (Array.isArray(transactionsRes.data)) {
        const sorted = transactionsRes.data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
        setRecentTransactions(sorted);
      }

    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.response?.data?.message || "Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleContactAdded = () => {
    setIsAddContactDialogOpen(false);
    fetchContacts();
  };

  const filteredContacts = useMemo(() => {
    let result = contacts;

    // Filter
    if (searchTerm) {
      result = result.filter(
        (contact) =>
          contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    return result.sort((a, b) => {
      if (sortOption === "name-asc") {
        return a.name.localeCompare(b.name);
      } else if (sortOption === "owed-desc") {
        return (b.netBalance || 0) - (a.netBalance || 0);
      } else if (sortOption === "owe-desc") {
        return (a.netBalance || 0) - (b.netBalance || 0); // Most negative first (lowest value)
      }
      return 0;
    });
  }, [contacts, searchTerm, sortOption]);

  // Calculate Dashboard Totals
  const totalYouAreOwed = contacts.reduce((acc, c) => acc + (c.netBalance && c.netBalance > 0 ? c.netBalance : 0), 0);
  const totalYouOwe = contacts.reduce((acc, c) => acc + (c.netBalance && c.netBalance < 0 ? c.netBalance : 0), 0);
  const totalNetBalance = totalYouAreOwed + totalYouOwe;

  // Placeholder for delete action
  const handleDeleteContact = async (
    contactId: string,
    contactName: string
  ) => {
    if (!token) {
      toast.error("Authentication error. Please sign in again.");
      return;
    }

    // You can use a more robust confirmation dialog component if you prefer
    if (
      window.confirm(
        `Are you sure you want to delete "${contactName}"? This action cannot be undone.`
      )
    ) {
      try {
        await apiClient.delete(`/contacts/${contactId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success(`Contact "${contactName}" deleted successfully.`);
        fetchContacts(); // Refresh the contact list
      } catch (err: any) {
        console.error("Failed to delete contact:", err);
        const errorMessage =
          err.response?.data?.message || `Failed to delete "${contactName}".`;
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteAllContacts = async () => {
    if (!token) {
      toast.error("Authentication error. Please sign in again.");
      return;
    }

    setIsDeletingAll(true);
    try {
      const response = await apiClient.delete("/contacts/all/my-contacts", {
        // Match backend path
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Successfully deleted ${response.data.count} contact(s).`);
      fetchContacts(); // Refresh the contact list (it should be empty)
    } catch (err: any) {
      console.error("Failed to delete all contacts:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to delete all contacts.";
      toast.error(errorMessage);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!token) {
      toast.error("Authentication error.");
      return;
    }

    if (file.type !== "text/csv") {
      toast.error("Invalid file type. Please upload a CSV file.");
      if (importFileInputRef.current) importFileInputRef.current.value = ""; // Reset file input
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post("/contacts/import/csv", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      const {
        importedCount,
        skippedCount,
        errors: importErrors,
      } = response.data;
      let message = `${importedCount} contact(s) imported successfully.`;
      if (skippedCount > 0)
        message += ` ${skippedCount} contact(s) were skipped (duplicates or missing data).`;
      toast.success(message);

      if (importErrors && importErrors.length > 0) {
        importErrors.forEach((errMsg: string) =>
          toast.warning(errMsg, { duration: 10000 })
        );
        console.warn("Import warnings/errors:", importErrors);
      }

      fetchContacts(); // Refresh the list
    } catch (err: any) {
      console.error("Failed to import contacts:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to import contacts.";
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
      if (importFileInputRef.current) importFileInputRef.current.value = ""; // Reset file input
    }
  };

  if (
    authLoading ||
    (isLoading && contacts.length === 0 && !error && !searchTerm)
  ) {
    return <div className="p-4 text-center">Loading contacts...</div>;
  }

  if (!authUser) {
    return (
      <div className="p-4 text-center">Please sign in to view contacts.</div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      {/* Dashboard Summary - Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total You are Owed</p>
          <p className="text-2xl font-bold text-green-600 mt-2">+₹{totalYouAreOwed.toFixed(2)}</p>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total You Owe</p>
          <p className="text-2xl font-bold text-red-600 mt-2">-₹{Math.abs(totalYouOwe).toFixed(2)}</p>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Net Balance</p>
          <p className={`text-2xl font-bold mt-2 ${totalNetBalance >= 0 ? 'text-foreground' : 'text-red-600'}`}>
            {totalNetBalance >= 0 ? "+" : "-"}₹{Math.abs(totalNetBalance).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* <h1 className="text-2xl md:text-3xl font-semibold">Your Contacts</h1> */}
        <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full sm:w-auto gap-2 items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                  <DropdownMenuRadioItem value="name-asc">Name (A-Z)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="owed-desc">Highest Owed to You</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="owe-desc">Highest You Owe</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

          <input
            type="file"
            accept=".csv"
            ref={importFileInputRef}
            onChange={handleFileUpload}
            style={{ display: "none" }}
            disabled={isImporting}
          />
          <Button
            variant="outline"
            onClick={() => importFileInputRef.current?.click()}
            disabled={isImporting}
            className="flex-shrink-0"
          >
            {isImporting ? (
              <span className="mr-2">Importing...</span>
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            Import CSV
          </Button>
          <Dialog
            open={isAddContactDialogOpen}
            onOpenChange={setIsAddContactDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => setIsAddContactDialogOpen(true)}
                className="flex-shrink-0"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Enter the details for your new contact. Click save when you're
                  done.
                </DialogDescription>
              </DialogHeader>
              <AddContactForm
                onContactAdded={handleContactAdded}
                onClose={() => setIsAddContactDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          {contacts.length > 0 && ( // Only show if there are contacts to delete
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeletingAll}
                  className="flex-shrink-0"
                >
                  {isDeletingAll ? (
                    <span className="mr-2">Deleting...</span>
                  ) : (
                    <Trash className="mr-2 h-4 w-4" />
                  )}
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete ALL of your contacts.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingAll}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllContacts}
                    disabled={isDeletingAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeletingAll ? "Deleting..." : "Yes, delete all"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        </div>
      </div>

      {error && (
        <p className="text-destructive bg-destructive/10 p-3 rounded-md mb-4">
          {error}
        </p>
      )}

      {isLoading && filteredContacts.length === 0 && !error && (
        <p className="text-center py-10 text-muted-foreground">Loading...</p>
      )}

      {!isLoading &&
        contacts.length === 0 &&
        !error && ( // Show this only if original contacts array is empty
          <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No contacts yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first contact.
            </p>
          </div>
        )}

      {!isLoading &&
        contacts.length > 0 &&
        filteredContacts.length === 0 &&
        searchTerm &&
        !error && (
          <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No contacts found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search terms.
            </p>
          </div>
        )}

      {filteredContacts.length > 0 && (
        <div className="bg-card border rounded-lg shadow-sm">
          <ul role="list" className="divide-y divide-border">
            {filteredContacts.map((contact) => (
              <li
                key={contact.id}
                className="flex items-center justify-between gap-x-6 p-4 hover:bg-muted/50"
              >
                <Link
                  href={`/contacts/${contact.id}`}
                  onClick={() =>
                    setSelectedContact({
                      id: contact.id,
                      name: contact.name,
                      email: contact.email,
                      phone: contact.phone,
                    })
                  }
                  className="block hover:bg-muted/50 -m-4 p-4 rounded-md hover:cursor-pointer w-full"
                >
                  <div className="flex items-center justify-between p-4">
                  <div className="flex min-w-0 gap-x-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                    <div className="min-w-0 flex-auto">
                      <p className="text-sm font-semibold leading-6 text-foreground">
                        {contact.name}
                        </p>
                      {(contact.email || contact.phone) && (
                        <p className="mt-1 truncate text-xs leading-5 text-muted-foreground flex items-center">
                          {contact.email ? (
                            <Mail className="mr-1.5 h-3 w-3 " />
                          ) : (
                            <Phone className="mr-1.5 h-3 w-3 " />
                          )}
                          {contact.email || contact.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-x-4">
                    {/* Net Balance Display */}
                    {typeof contact.netBalance === "number" && (
                      <div className="hidden sm:flex sm:flex-col sm:items-end">
                        <p
                          className={`text-sm font-medium leading-6 ${
                            contact.netBalance > 0
                              ? "text-green-600"
                              : contact.netBalance < 0
                                ? "text-red-600"
                                : "text-foreground"
                          }`}
                        >
                          {contact.netBalance >= 0 ? "+" : ""}
                          {Math.abs(contact.netBalance).toFixed(2)}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {contact.netBalance > 0
                            ? "Owes you"
                            : contact.netBalance < 0
                              ? "You owe"
                              : "Settled"}
                        </p>
                      </div>
                    )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={(e) => {
                          e.preventDefault(); // Prevent navigation
                          handleDeleteContact(contact.id, contact.name);
                        }}
                        title="Delete Contact"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Contact</span>
                      </Button>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Activity Section */}
      {recentTransactions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="bg-card border rounded-lg shadow-sm">
            <ul role="list" className="divide-y divide-border">
              {recentTransactions.map((tx) => (
                <li key={tx.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{tx.contact?.name || "Unknown Contact"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                  <div className={`text-sm font-bold ${tx.type === 'GAVE' ? 'text-red-600' : 'text-green-600'}`}>
                    {tx.type === 'GAVE' ? '-' : '+'}₹{Number(tx.amount).toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
