import { Request } from 'express';

export interface AppCookies {
  refresh_token?: string;
  'xsrf_token': string;
}

// 2. Mở rộng Interface Request chuẩn của Express
export interface RequestWithCookies extends Request {
  cookies: AppCookies;
}