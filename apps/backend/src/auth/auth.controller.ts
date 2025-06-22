import { Controller, Post, Body, ValidationPipe, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard'; // <-- We'll create this guard next
import { SignUpAuthDto } from './dto/signup-auth.dto';
import { SignInAuthDto } from './dto/signin-auth.dto';

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
}