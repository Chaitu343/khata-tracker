// apps/backend/src/contacts/dto/create-contact.dto.ts
import { IsString, IsEmail, IsOptional, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  // @IsPhoneNumber(null, { message: 'Please enter a valid phone number' }) // Add region or remove if too strict for now
  @IsString() // Keeping it simple for now, frontend will do more robust validation
  phone?: string;
}