// apps/frontend/src/components/transactions/AddTransactionForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
  initialData?: any; // Add initialData prop
  defaultValues?: Partial<any>;
  onTransactionAdded: () => void;
  onClose?: () => void;
}

export function AddTransactionForm({ contactId, initialData, defaultValues, onTransactionAdded, onClose }: AddTransactionFormProps) {
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

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setNotes(initialData.notes || '');
      setDate(initialData.date ? new Date(initialData.date) : new Date());
      setProofUrl(initialData.proofUrl || null);
    } else if (defaultValues) {
      if (defaultValues.amount) setAmount(defaultValues.amount.toString());
      if (defaultValues.type) setType(defaultValues.type);
      if (defaultValues.notes) setNotes(defaultValues.notes);
    }
  }, [initialData, defaultValues]);


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
      const payload = {
        amount: parseFloat(amount),
        type,
        contactId,
        notes,
        proofUrl: finalProofUrl,
        date: date ? date.toISOString() : undefined,
      };

      if (initialData && initialData.id) {
        await apiClient.patch(`/transactions/${initialData.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Transaction updated successfully!');
      } else {
        await apiClient.post('/transactions', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Transaction recorded successfully!');
      }

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount and Type Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="transaction-amount" className="text-sm font-medium">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <Input
              id="transaction-amount" type="number" step="0.01" placeholder="0.00"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className={`pl-7 ${errors.amount ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Date</Label>
          <DatePicker date={date} onDateChange={setDate} />
          {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
        </div>
      </div>

      {/* Transaction Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Who paid?</Label>
        <RadioGroup defaultValue={type} value={type} onValueChange={(value: TransactionTypeEnum) => setType(value as TransactionTypeEnum)} className="grid grid-cols-2 gap-4">
          <div>
            <RadioGroupItem value={TransactionTypeEnum.GAVE} id="type-gave" className="peer sr-only" />
            <Label
              htmlFor="type-gave"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 [&:has([data-state=checked])]:border-red-500 cursor-pointer transition-all"
            >
              <span className="text-lg font-bold text-red-600 mb-1">You Gave</span>
              <span className="text-xs text-muted-foreground text-center">Contact owes you</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value={TransactionTypeEnum.GOT} id="type-got" className="peer sr-only" />
            <Label
              htmlFor="type-got"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 [&:has([data-state=checked])]:border-green-500 cursor-pointer transition-all"
            >
              <span className="text-lg font-bold text-green-600 mb-1">You Got</span>
              <span className="text-xs text-muted-foreground text-center">Contact paid you</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="transaction-notes" className="text-sm font-medium">Notes (Optional)</Label>
        <Textarea
          id="transaction-notes" value={notes} onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setNotes(e.target.value)}
          placeholder="e.g., Lunch expenses, Lent for shopping"
          className="resize-none"
          rows={3}
        />
      </div>

      {/* Proof Upload */}
      <div className="space-y-2">
        <Label htmlFor="transaction-proof-file" className="text-sm font-medium">Attach Proof (Optional)</Label>
        {!imagePreviewUrl && !proofUrl && !isUploadingProof && ( // Show input only if no preview/URL
          <div className="flex items-center justify-center w-full">
            <label htmlFor="transaction-proof-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileUp className="w-8 h-8 mb-3 text-gray-400" />
                <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-gray-500">SVG, PNG, JPG or PDF (MAX. 5MB)</p>
              </div>
              <Input
                id="transaction-proof-file" type="file" onChange={handleFileChange}
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.pdf"
              />
            </label>
          </div>
        )}
        {isUploadingProof && <p className="text-sm text-muted-foreground mt-1">Uploading proof...</p>}
        {errors.proof && <p className="text-xs text-destructive mt-1">{errors.proof}</p>}

        {(imagePreviewUrl || proofUrl) && !isUploadingProof && (
          <div className="mt-2 p-2 border rounded-md flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
                {imagePreviewUrl ? ( // Prioritize local preview
                <img src={imagePreviewUrl} alt="Proof preview" className="h-16 w-16 object-cover rounded-md border" />
                ) : proofUrl?.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <img src={proofUrl} alt="Proof preview" className="h-16 w-16 object-cover rounded-md border" />
                ) : proofUrl ? (
                    <div className="h-16 w-16 flex items-center justify-center bg-background rounded-md border">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[200px]">{proofFile ? proofFile.name : 'Attached Proof'}</span>
                {!proofFile && proofUrl &&
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[200px]">
                    View Original
                  </a>
                }
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={removeProof} type="button" className="text-destructive hover:bg-destructive/10">
                <X className="h-4 w-4" />
            </Button>
            </div>
        )}
      </div>


      <div className="flex justify-end space-x-2 pt-4 border-t">
        {onClose && <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isUploadingProof}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting || isUploadingProof} className="min-w-[120px]">
          {isSubmitting ? (isUploadingProof ? 'Uploading...' : 'Saving...') : (initialData ? 'Update' : 'Save Transaction')}
        </Button>
      </div>
    </form>
  );
}