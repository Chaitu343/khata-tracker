import { Injectable, LoggerService } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    // This transporter configuration is created once when the service is instantiated.
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER, // your email from .env
        pass: process.env.EMAIL_PASS, // your app password from .env
      },
    });
  }

  async sendUserConfirmation(user: { email: string; name: string }) {
    const { email, name } = user;
    try {
      await this.transporter.sendMail({
        from: `"No Reply" <${process.env.EMAIL_USER}>`, // sender address
        to: email, // list of receivers
        subject: 'Welcome to Our App! ✔', // Subject line
        text: `Hi ${name}, welcome to our application!`, // plain text body
        html: `<b>Hi ${name},</b><br><p>Welcome to our application. We're excited to have you on board!</p>`, // html body
      });
      console.log('Confirmation email sent successfully.');
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      // In a real app, you might want to throw an exception or handle this more gracefully
    }
  }

    // --- NEW METHOD for Password Reset ---
  async sendPasswordResetEmail(userEmail: string, token: string) {
    // In a real app, you'd use a frontend URL from your .env file
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"No Reply" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Your Password Reset Request',
        html: `
          <p>You requested a password reset.</p>
          <p>Click this <a href="${resetLink}">link</a> to reset your password.</p>
          <p>This link will expire in 10 minutes.</p>
        `,
      });
      console.log('Password reset email sent successfully.');
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }

  // --- NEW METHOD for sending OTP ---
  async sendOtp(userEmail: string, otp: string) {
    try {
      await this.transporter.sendMail({
        from: `"No Reply" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Your Login OTP Code',
        html: `
          <p>Here is your One-Time Password (OTP) for login:</p>
          <h2>${otp}</h2>
          <p>This code will expire in 5 minutes.</p>
        `,
      });
      console.log('OTP email sent successfully.');
    } catch (error) {
      console.error('Error sending OTP email:', error);
    }
  }
}