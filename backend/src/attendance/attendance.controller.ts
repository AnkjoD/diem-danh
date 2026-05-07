import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile, BadRequestException, Req, UploadedFiles, Res } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AttendanceService } from './attendance.service';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Attendances')
@ApiBearerAuth()
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Lấy danh sách điểm danh theo buổi học' })
  getBySession(@Param('sessionId') sessionId: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.attendanceService.getAttendanceBySession(sessionId, teacher_id);
  }

  @Get('matrix/:classId')
  @ApiOperation({ summary: 'Lấy ma trận điểm danh của lớp' })
  getMatrix(@Param('classId') classId: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.attendanceService.getClassAttendanceMatrix(classId, teacher_id);
  }

  @Get('warnings/:classId')
  @ApiOperation({ summary: 'Lấy danh sách sinh viên vắng học quá ngưỡng' })
  getWarnings(@Param('classId') classId: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.attendanceService.getAttendanceWarnings(classId, teacher_id);
  }

  @Get('export/:classId')
  @ApiOperation({ summary: 'Xuất báo cáo Excel' })
  async exportExcel(@Param('classId') classId: string, @Req() req: any, @Res() res: Response) {
    const teacher_id = req.user._id || req.user.id;
    const buffer: any = await this.attendanceService.exportClassToExcel(classId, teacher_id);
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="attendance-report-${classId}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('manual')
  @ApiOperation({ summary: 'Điểm danh thủ công (Có mặt, Vắng mặt, Muộn)' })
  markManual(@Body() body: { session_id: string; student_id: string; status: string }, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.attendanceService.markAttendanceManual(body.session_id, body.student_id, body.status, teacher_id);
  }

  @Post('recognize')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Nhận diện khuôn mặt từ một hoặc nhiều ảnh' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  recognizeFace(
    @Body('session_id') sessionId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (!sessionId) throw new BadRequestException('session_id is required');
    if (!files || files.length === 0) throw new BadRequestException('files are required');
    const teacher_id = req.user._id || req.user.id;
    return this.attendanceService.recognizeFaces(sessionId, files, teacher_id);
  }

  @Post('remove')
  @ApiOperation({ summary: 'Gỡ điểm danh của sinh viên' })
  removeAttendance(@Body() body: { session_id: string; student_id: string; archive?: boolean }, @Req() req: any) {
    if (!body.session_id || !body.student_id) throw new BadRequestException('session_id and student_id are required');
    const teacher_id = req.user._id || req.user.id;
    return this.attendanceService.removeAttendanceRecord(body.session_id, body.student_id, teacher_id, body.archive ?? true);
  }
}