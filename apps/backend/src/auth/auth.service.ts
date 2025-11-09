import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignUpAuthDto } from './dto/signup-auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { Prisma } from '@prisma/client';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // --- USER SIGNUP LOGIC ---
  async signUp(signUpAuthDto: SignUpAuthDto) {
    const { email, password, name, phoneNo } = signUpAuthDto;
    console.log(
      'this is the signup request body', signUpAuthDto
    )
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    try {
      console.log('before saving the user into the db');
      const user = await this.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash: hashedPassword,
          name: name,
          phoneNo: phoneNo,
        },
      });
      console.log('user', user);
      const { passwordHash, ...result } = user;
      return result;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      console.log(error)
      throw new InternalServerErrorException(
        'Something went wrong during sign up.',
      );
    }
  }

  // --- USER VALIDATION LOGIC ---
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result; // Return user object without passwordHash
    }
    return null;
  }

  // -- USER LOGIN LOGIC ---
  async login(user: any) {
    // user comes from LocalStrategy's validate method
    const payload = { email: user.email, sub: user.id, name: user.name }; // Customize payload as needed
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        // Return some user info along with the token
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  // --- FORGOT PASSWORD LOGIC ---
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal that the user doesn't exist for security reasons
      return { message: 'If a user with that email exists, a reset link has been sent.' };
    }

    // Generate a secure, URL-safe token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Hash the token before saving it to the database
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set an expiry date (e.g., 10 minutes from now)
    const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: { 
        passwordResetToken: passwordResetToken, 
        passwordResetExpires: passwordResetExpires 
      } as Prisma.UserUpdateInput,
    });

    // Send the *unhashed* token to the user's email
    await this.mailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'If a user with that email exists, a reset link has been sent.' };
  }

  // --- RESET PASSWORD LOGIC ---
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Hash the incoming token to match the one in the DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() }, // Check if token is not expired
      } as Prisma.UserWhereInput,
    });

    if (!user) {
      throw new UnauthorizedException('Password reset token is invalid or has expired.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        // Clear the reset token fields after a successful reset
        passwordResetToken: null,
        passwordResetExpires: null,
      } as Prisma.UserUpdateInput,
    });

    return { message: 'Password has been reset successfully.' };
  }

   // --- REQUEST OTP LOGIC ---
  async requestOtp(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User with this email not found.');
    }

    // --- Generate a simple 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5-minute expiry

    await this.prisma.user.update({
      where: { email },
      data: { otp, otpExpires } as Prisma.UserUpdateInput,
    });

    await this.mailService.sendOtp(email, otp);
    return { message: 'An OTP has been sent to your email.' };
  }

  // --- LOGIN WITH OTP LOGIC ---
  async loginWithOtp(email: string, providedOtp: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        otp: providedOtp,
        otpExpires: { gt: new Date() },
      } as Prisma.UserWhereInput,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid OTP or OTP has expired.');
    }

    // OTP is single-use, so clear it after successful validation
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otpExpires: null } as Prisma.UserUpdateInput,
    });

    // Now that the user is validated, use the existing login method to issue a JWT
    const { passwordHash, ...userPayload } = user;
    return this.login(userPayload);
  }
}
