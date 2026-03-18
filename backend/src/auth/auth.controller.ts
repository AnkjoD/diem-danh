import { Controller, Post, Body, Res, UnauthorizedException, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Response, Request } from 'express';
import { RequestWithCookies } from './interfaces/app-cookie.interface';
import { Public } from '~/common/decorators/public.decorator';
import { TeacherService } from '~/teacher/teacher.service';
import { CreateTeacherDto } from '~/teacher/dto/create-teacher.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly teacherService: TeacherService
  ) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.cookie('xsrf_token', result.xsrf_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return {
      access_token: result.access_token,
      teacher: result.teacher,
    };
  }
  @Public()
  @Post('register')
  async register(@Body() loginDto: CreateTeacherDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(loginDto);
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.cookie('xsrf_token', result.xsrf_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return {
      access_token: result.access_token,
      teacher: result.teacher,
    };
  }
  @Post('refresh')
  async refresh(@Req() req: RequestWithCookies) {
  
    const refreshToken = req.cookies['refresh_token'] as string | null ;
    if (!refreshToken) throw new UnauthorizedException();
    const newAccessToken = await this.authService.refreshAccessToken(refreshToken);
    return {
      access_token: newAccessToken,
    }
  }

  
}