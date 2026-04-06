import { AuthGuard } from '@nestjs/passport';
import { Injectable,ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { RequestWithCookies } from '../interfaces/app-cookie.interface';
import { IS_PUBLIC_KEY } from '~/common/decorators/public.decorator';
import { Reflector } from '@nestjs/core/services/reflector.service';
@Injectable()
export class AppAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

   
    if (isPublic) return true;


    const isValidJwt = await super.canActivate(context);
    if (!isValidJwt) return false;
    
    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const cookieToken = request.cookies['xsrf_token'];
    const headerToken = request.headers['x-xsrf-token'];

    if (!cookieToken || cookieToken !== headerToken) {
      console.error('🔴 Cảnh báo: Token XSRF không khớp! Có dấu hiệu tấn công giả mạo.');
      throw new UnauthorizedException('Yêu cầu không hợp lệ (CSRF detected)');
    }

    return true;
  }
}