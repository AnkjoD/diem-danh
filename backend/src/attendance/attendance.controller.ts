import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceService } from './attendance.service';

@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('session/:sessionId')
  getBySession(@Param('sessionId') sessionId: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.attendanceService.getAttendanceBySession(sessionId, teacher_id);
  }

  @Post('manual')
  markManual(@Body() body: { session_id: string; student_id: string; status: string }, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.attendanceService.markAttendanceManual(body.session_id, body.student_id, body.status, teacher_id);
  }

  @Post('recognize')
  @UseInterceptors(FileInterceptor('file'))
  recognizeFace(
    @Body('session_id') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!sessionId) throw new BadRequestException('session_id is required');
    if (!file) throw new BadRequestException('file is required');
    const teacher_id = req.user._id;
    return this.attendanceService.recognizeFace(sessionId, file, teacher_id);
  }

  @Post('remove')
  removeAttendance(@Body() body: { session_id: string; student_id: string }, @Req() req: any) {
    if (!body.session_id || !body.student_id) throw new BadRequestException('session_id and student_id are required');
    const teacher_id = req.user._id;
    return this.attendanceService.removeAttendanceRecord(body.session_id, body.student_id, teacher_id);
  }
}