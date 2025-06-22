// apps/frontend/src/components/transactions/AddTransactionForm.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // For notes
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // For transaction type
import { DatePicker } from '@/components/ui/datepicker'; // We'll create a basic DatePicker
import { toast } from 'sonner';
import { FileUp, X, FileText, Image as ImageIcon } from 'lucide-react'; // Image for preview

export enum TransactionTypeEnum { // To match backend DTO
    GAVE = 'GAVE',
    GOT = 'GOT',
}

interface AddTransactionFormProps {
  contactId: string;
  onTransactionAdded: () => void;
  onClose?: () => void;
}

export function AddTransactionForm({ contactId, onTransactionAdded, onClose }: AddTransactionFormProps) {
  const { token } = useAuth();
  const [amount, setAmount] = useState<string>(''); // Keep as string for input, convert on submit
  const [type, setType] = useState<TransactionTypeEnum>(TransactionTypeEnum.GAVE);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null); // URL from backend
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null); // For local image preview

  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);


  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string | undefined } = {};
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Please enter a valid positive amount.';
    }
    if (!date) {
        newErrors.date = 'Please select a date.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setProofUrl(null); // Clear any previous URL
    setImagePreviewUrl(null); // Clear previous preview
    setProofFile(null); // Clear previous file selection

    if (file) {
      setErrors(prev => ({ ...prev, proof: undefined }));
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']; // Add more if needed
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, proof: 'Unsupported file type.' }));
        return;
      }
      if (file.size > maxSize) {
        setErrors(prev => ({ ...prev, proof: 'File is too large (max 5MB).' }));
        return;
      }

      setProofFile(file); // Set file to be uploaded with form
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeProof = () => {
    setProofFile(null);
    setProofUrl(null);
    setImagePreviewUrl(null);
    setErrors(prev => ({ ...prev, proof: undefined }));
    const fileInput = document.getElementById('transaction-proof-file') as HTMLInputElement;
    if (fileInput) fileInput.value = ''; // Reset file input
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }
    if (!token) {
        toast.error("Authentication error."); return;
    }

    setIsSubmitting(true);
    let finalProofUrl = proofUrl; // Use already uploaded URL if available

    // If a new file is selected, upload it first
    if (proofFile && !proofUrl) {
      setIsUploadingProof(true);
      const formData = new FormData();
      formData.append('file', proofFile);
      try {
        const uploadResponse = await apiClient.post('/uploads/proof', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        finalProofUrl = uploadResponse.data.url;
        toast.success("Proof uploaded!");
      } catch (uploadError: any) {
        toast.error(uploadError.response?.data?.message || "Proof upload failed.");
        setIsSubmitting(false);
        setIsUploadingProof(false);
        return;
      } finally {
        setIsUploadingProof(false);
      }
    }

    try {
      await apiClient.post(
        '/transactions',
        {
          amount: parseFloat(amount),
          type,
          contactId,
          notes,
          proofUrl: finalProofUrl,
          date: date ? date.toISOString() : undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Transaction recorded successfully!');
      onTransactionAdded();
      if (onClose) onClose();
      // Reset form can be done here
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount */}
      <div>
        <Label htmlFor="transaction-amount" >Amount</Label>
        <Input
          id="transaction-amount" type="number" step="0.01" placeholder="0.00"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          className={errors.amount ? 'border-destructive' : ''}
        />
        {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
      </div>

      {/* Type */}
      <div>
        <Label>Transaction Type</Label>
        <RadioGroup defaultValue={type} onValueChange={(value: TransactionTypeEnum) => setType(value as TransactionTypeEnum)} className="flex space-x-4 mt-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value={TransactionTypeEnum.GAVE} id="type-gave" />
            <Label htmlFor="type-gave">You Gave (Contact owes you)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value={TransactionTypeEnum.GOT} id="type-got" />
            <Label htmlFor="type-got">You Got (Contact paid you)</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Date */}
      <div>
        <Label htmlFor="transaction-date">Date</Label>
        <DatePicker date={date} onDateChange={setDate} /> {/* Use shadcn DatePicker */}
        {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="transaction-notes">Notes (Optional)</Label>
        <Textarea
          id="transaction-notes" value={notes} onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setNotes(e.target.value)}
          placeholder="e.g., Lunch expenses, Lent for shopping"
        />
      </div>

      {/* Proof Upload */}
      <div>
        <Label htmlFor="transaction-proof-file">Attach Proof (Optional)</Label>
        {!imagePreviewUrl && !proofUrl && !isUploadingProof && ( // Show input only if no preview/URL
            <Input
            id="transaction-proof-file" type="file" onChange={handleFileChange}
            className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            accept=".jpg,.jpeg,.png,.gif,.pdf"
            />
        )}
        {isUploadingProof && <p className="text-sm text-muted-foreground mt-1">Uploading proof...</p>}
        {errors.proof && <p className="text-xs text-destructive mt-1">{errors.proof}</p>}

        {(imagePreviewUrl || proofUrl) && !isUploadingProof && (
            <div className="mt-2 p-2 border rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
                {imagePreviewUrl ? ( // Prioritize local preview
                <img src={imagePreviewUrl} alt="Proof preview" className="h-12 w-12 object-cover rounded" />
                ) : proofUrl?.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <img src={proofUrl} alt="Proof preview" className="h-12 w-12 object-cover rounded" />
                ) : proofUrl ? (
                <FileText className="h-8 w-8 text-muted-foreground" />
                ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" /> // Fallback if no URL/Preview
                )}
                {proofFile && <span className="text-sm truncate max-w-[150px]">{proofFile.name}</span>}
                {!proofFile && proofUrl &&
                    <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate max-w-[150px]">
                        {proofUrl.substring(proofUrl.lastIndexOf('/') + 1)}
                    </a>
                }
            </div>
            <Button variant="ghost" size="icon" onClick={removeProof} type="button" className="text-destructive hover:bg-destructive/10">
                <X className="h-4 w-4" />
            </Button>
            </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">Max 5MB. JPG, PNG, PDF.</p>
      </div>


      <div className="flex justify-end space-x-2 pt-2">
        {onClose && <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isUploadingProof}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting || isUploadingProof}>
          {isSubmitting ? (isUploadingProof ? 'Uploading...' : 'Saving...') : 'Save Transaction'}
        </Button>
      </div>
    </form>
  );
}