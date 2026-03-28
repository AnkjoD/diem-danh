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
      map(data => {
        const resultData = data?.data !== undefined ? data.data : data;

        return {
          statusCode,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          message: data?.message || 'Thành công', 
          // --- FIX LỖI HIỂN THỊ ẢNH TRÊN TRÌNH DUYỆT ---
          // Tự động chuyển đổi các URL minio nội bộ thành 127.0.0.1 để trình duyệt có thể load được.
          // Bạn có thể xóa logic này nếu sau này cấu hình Reverse Proxy (Nginx) chuẩn.
          data: this.sanitizeUrl(resultData), 
        };
      }),
    );
  }

  private sanitizeUrl(data: any): any {
    if (!data) return data;

    if (typeof data === 'string') {
      if (data.includes('minio:9000')) {
        return data.replace(/minio:9000/g, '127.0.0.1:9000');
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeUrl(item));
    }

    if (typeof data === 'object') {
      const sanitized = { ...data };
      for (const key in sanitized) {
        if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
          sanitized[key] = this.sanitizeUrl(sanitized[key]);
        }
      }
      return sanitized;
    }

    return data;
  }
}