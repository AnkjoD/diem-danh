import { Injectable } from '@nestjs/common';
import * as os from 'os';

@Injectable()
export class AppService {
  private calibratedIp: string | null = null;

  getHello(): string {
    return 'Hello World!';
  }

  setCalibratedIp(ip: string) {
    this.calibratedIp = ip;
  }

  getIpAddresses(): string[] {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    
    // Nếu có IP đã được cân chỉnh từ Dashboard, ưu tiên đặt lên đầu
    if (this.calibratedIp) {
      addresses.push(this.calibratedIp);
    }

    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (iface) {
        for (let i = 0; i < iface.length; i++) {
          const alias = iface[i];
          if (alias.family === 'IPv4' && !alias.internal) {
            // Tránh trùng lặp nếu nó đã được thêm vào từ calibratedIp
            if (alias.address !== this.calibratedIp) {
              addresses.push(alias.address);
            }
          }
        }
      }
    }
    return addresses.length > 0 ? addresses : ['localhost'];
  }
}
