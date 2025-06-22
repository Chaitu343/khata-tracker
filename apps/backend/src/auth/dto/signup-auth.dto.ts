/* eslint-disable prettier/prettier */
import { IsEmail, IsNotEmpty, IsString, IsOptional, MinLength } from 'class-validator';

export class SignUpAuthDto {
  @IsNotEmpty({ message: 'Email should not be empty' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Password should not be empty' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' }) // Good to have
  password: string;

  @IsNotEmpty({ message: 'Name should not be empty' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string if provided' })
  phoneNo?: string;
}