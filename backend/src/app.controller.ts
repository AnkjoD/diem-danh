import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hello')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('ip')
  getIp(): { ips: string[] } {
    return { ips: this.appService.getIpAddresses() };
  }

  @Post('calibrate')
  calibrate(@Body('hostIp') hostIp: string) {
    this.appService.setCalibratedIp(hostIp);
    return { success: true, calibratedTo: hostIp };
  }
}
