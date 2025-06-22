// apps/backend/src/transactions/dto/create-transaction.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsPositive, IsOptional, IsDateString, IsIn, IsUUID } from 'class-validator';
import { Type } from 'class-transformer'; // For transforming string to number

export enum TransactionType {
  GAVE = 'GAVE', // You gave money to contact (they owe you)
  GOT = 'GOT',   // You received money from contact (they paid you / you owe less)
}

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number) // Transform string from JSON payload to number
  amount: number;

  @IsNotEmpty()
  @IsIn([TransactionType.GAVE, TransactionType.GOT])
  type: TransactionType;

  @IsNotEmpty()
  // @IsUUID() // Assuming contactId is a UUID/CUID
  contactId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString() // URL will be a string
  proofUrl?: string;

  @IsOptional()
  @IsDateString()
  date?: string; // Will be converted to Date object in service
}