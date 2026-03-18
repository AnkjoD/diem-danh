import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { AppAuthGuard } from '~/auth/guards/app-auth.guard';

@Controller('attendance')
@UseGuards(AppAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  async markAttendance(@Body() body: MarkAttendanceDto) {
    const result = await this.attendanceService.markAttendance(body);
    return result;
  }

  @Get('session/:sessionId')
  async getAttendanceBySession(@Param('sessionId') sessionId: string) {
    const records = await this.attendanceService.getAttendanceBySession(sessionId);
    return records;
  }
}