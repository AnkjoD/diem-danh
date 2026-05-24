import { AuthGuard } from '@nestjs/passport';
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { RequestWithCookies } from '../interfaces/app-cookie.interface';
import { IS_PUBLIC_KEY } from '~/common/decorators/public.decorator';
import { Reflector } from '@nestjs/core/services/reflector.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Teacher } from '~/teacher/entities/teacher.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AppAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    // Development Bypass
    if (process.env.SKIP_AUTH === 'true') {
      const request = context.switchToHttp().getRequest<RequestWithCookies>();
      // Inject a mock teacher if not already present
      if (!request.user) {
        const mockTeacher = await this.teacherRepo.findOne({ where: {} });
        if (mockTeacher) {
          (request as any).user = {
            _id: mockTeacher.id,
            id: mockTeacher.id,
            email: mockTeacher.email,
            full_name: mockTeacher.full_name,
          };
        }
      }
      return true;
    }

    const isValidJwt = await super.canActivate(context);
    if (!isValidJwt) return false;

    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const cookieToken = request.cookies['xsrf_token'];
    const headerToken = request.headers['x-xsrf-token'];

    // Skip CSRF for cookie-less clients (mobile/QR). Bearer JWT is CSRF-safe by design.
    // Only block if cookie IS present but header doesn't match (browser CSRF attack).
    if (cookieToken && cookieToken !== headerToken) {
      throw new UnauthorizedException('Yêu cầu không hợp lệ (CSRF detected)');
    }

    return true;
  }
}