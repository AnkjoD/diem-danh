import { Controller, Get, Post, Body, Param, Delete, Query, Req } from '@nestjs/common';
import { SessionService } from './session.service';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  create(@Req() req: any, @Body('class_id') classId: string, @Body('late_threshold') lateThreshold?: string, @Body('end_threshold') endThreshold?: string) {
    const teacher_id = req.user._id;
    return this.sessionService.create(classId, teacher_id, lateThreshold, endThreshold);
  }

  @Post(':id')
  update(@Param('id') id: string, @Body() body: { late_threshold?: string, end_threshold?: string }, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.sessionService.update(id, body, teacher_id);
  }

  @Get()
  findAll(@Query('classId') classId: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.sessionService.findAll(teacher_id, classId);
  }

  @Get('today/:classId')
  findToday(@Param('classId') classId: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.sessionService.findTodaySession(teacher_id, classId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.sessionService.findOne(id, teacher_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.sessionService.remove(id, teacher_id);
  }
}