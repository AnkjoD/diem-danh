import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {compare} from 'bcrypt';
import { TeacherService } from '../teacher/teacher.service';
import { LoginDto } from './dto/login.dto';
import { IJwtPayload } from './interfaces/jwt-payload.interface';
import { CreateTeacherDto } from '~/teacher/dto/create-teacher.dto';
import { Teacher } from '~/teacher/schemas/teacher.schema';

@Injectable()
export class AuthService {
  constructor(
    private teacherService: TeacherService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: CreateTeacherDto) {
    const existingTeacher = await this.teacherService.findByEmail(registerDto.email);
    if (existingTeacher) {
      throw new UnauthorizedException('Email đã tồn tại');
    }
    const teacher = await this.teacherService.create(registerDto);

    const payload: IJwtPayload = {
      sub: teacher._id.toString(),
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
    const teacher: Teacher| null = await this.teacherService.findByEmail(loginDto.email);
    if (!teacher) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await compare(loginDto.password, teacher.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: IJwtPayload = {
      sub: teacher._id.toString(),
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

    return accessToken;
  } catch (e) {
    console.error(e)
    throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng login lại!');
  }
}
}