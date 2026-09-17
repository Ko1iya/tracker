import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload';
import { isEmailAllowed, parseAllowedEmails } from './registration-allowlist';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Проверка идёт до всего остального: иначе по 409 Conflict можно было бы
    // перебором выяснить, кто уже зарегистрирован.
    const allowedEmails = parseAllowedEmails(
      this.config.get<string>('REGISTER_ALLOWED_EMAILS'),
    );
    if (!isEmailAllowed(dto.email, allowedEmails)) {
      throw new ForbiddenException('Registration is invite-only');
    }

    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
    });

    return this.buildAuthResponse(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.password);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user.id, user.email);
  }

  private buildAuthResponse(userId: number, email: string) {
    const payload: JwtPayload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
      user: { id: userId, email },
    };
  }
}
