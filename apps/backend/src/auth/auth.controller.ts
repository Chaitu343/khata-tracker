import { Controller, Post, Body, ValidationPipe, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard'; // <-- We'll create this guard next
import { SignUpAuthDto } from './dto/signup-auth.dto';
import { SignInAuthDto } from './dto/signin-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { LoginOtpDto } from './dto/login-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signUp(@Body(ValidationPipe) signUpAuthDto: SignUpAuthDto) {
    console.log('Request for signup')
    return this.authService.signUp(signUpAuthDto);
  }

  @UseGuards(LocalAuthGuard) // This guard will trigger LocalStrategy
  @Post('signin')
  async signIn(@Request() req, @Body(ValidationPipe) signInAuthDto: SignInAuthDto) {
    // signInAuthDto is here mainly for validation pipe to run,
    // req.user is populated by LocalAuthGuard/LocalStrategy
    return this.authService.login(req.user);
  }

  // --- NEW: FORGOT PASSWORD ENDPOINT ---
  @Post('forgot-password')
  async forgotPassword(@Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  // --- NEW: RESET PASSWORD ENDPOINT ---
  @Post('reset-password')
  async resetPassword(@Body(ValidationPipe) resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    return this.authService.resetPassword(token, newPassword);
  }

  // --- NEW: REQUEST OTP ENDPOINT ---
  @Post('otp/request')
  async requestOtp(@Body(ValidationPipe) requestOtpDto: RequestOtpDto) {
    return this.authService.requestOtp(requestOtpDto.email);
  }

  // --- NEW: LOGIN WITH OTP ENDPOINT ---
  @Post('otp/login')
  async loginWithOtp(@Body(ValidationPipe) loginOtpDto: LoginOtpDto) {
    const { email, otp } = loginOtpDto;
    return this.authService.loginWithOtp(email, otp);
  }
}