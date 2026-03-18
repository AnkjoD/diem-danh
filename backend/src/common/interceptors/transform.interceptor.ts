// Đường dẫn tượng trưng: src/common/interceptors/transform.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
export interface ResponseMessage<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseMessage<T>> {
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseMessage<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map(data => ({
        statusCode,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        message: data?.message || 'Thành công', 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        data: data?.data !== undefined ? data.data : data, 
      })),
    );
  }
}