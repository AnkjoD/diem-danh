import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {compare} from 'bcrypt';
import { TeacherService } from '../teacher/teacher.service';
import { LoginDto } from './dto/login.dto';
import { IJwtPayload } from './interfaces/jwt-payload.interface';
import { CreateTeacherDto } from '../teacher/dto/create-teacher.dto';
import { Teacher } from '../teacher/entities/teacher.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private teacherService: TeacherService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: CreateTeacherDto) {
    const teacher = await this.teacherService.create(registerDto);
    const payload: IJwtPayload = {
      sub: teacher.id,
      full_name: teacher.full_name,
      email: teacher.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '1h' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
    const xsrfToken = btoa(Math.random().toString()).substring(0, 32);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      xsrf_token: xsrfToken,
      teacher: {
        email: teacher.email,
        full_name: teacher.full_name,
      }
    };
  }
  async login(loginDto: LoginDto) {
    const teacher = await this.teacherService.findByEmail(loginDto.email);
    if (!teacher) {
      throw new UnauthorizedException('Email hoặc password không đúng');
    }
    const isPasswordValid = await compare(loginDto.password, teacher.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc password không đúng');
    }

    const payload: IJwtPayload = {
      sub: teacher.id,
      full_name: teacher.full_name,
      email: teacher.email,

    };

    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '1h' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
    const xsrfToken = btoa(Math.random().toString()).substring(0, 32);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      xsrf_token: xsrfToken,
      teacher: {
        email: teacher.email,
        full_name: teacher.full_name,
      }
    };
  }
  async refreshAccessToken(refreshToken: string) {
  try {
    const payload: IJwtPayload & {exp:number;
      iat:number;

    } = await this.jwtService.verifyAsync(refreshToken, {
      secret: process.env.JWT_SECRET, 
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { exp, iat, ...cleanPayload } = payload;
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const accessToken = await this.jwtService.signAsync(cleanPayload, { expiresIn: '1h' });
    const newRefreshToken = await this.jwtService.signAsync(cleanPayload, { expiresIn: '7d' });
    const xsrfToken = btoa(Math.random().toString()).substring(0, 32);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      xsrf_token: xsrfToken,
    };
  } catch (e) {
    this.logger.error(`Refresh token error: ${e.message}`, e.stack);
    throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng login lại!');
  }
}
}