import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  LoggerService,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignUpAuthDto } from './dto/signup-auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
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
}
