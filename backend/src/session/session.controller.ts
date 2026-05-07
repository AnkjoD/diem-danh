import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Delete, Query, Req } from '@nestjs/common';
import { SessionService } from './session.service';
import { Session } from './entities/session.entity';
import { Public } from '~/common/decorators/public.decorator';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Public()
  @ApiOperation({ summary: 'Verify if a session is valid for remote capture' })
  @Get('verify/:id')
  verify(@Param('id') id: string) {
    return this.sessionService.verify(id);
  }




  @ApiOperation({ summary: 'Create a new attendance session' })
  @ApiCreatedResponse({ type: Session })
  @Post()
  create(@Req() req: any, @Body('class_id') classId: string, @Body('late_threshold') lateThreshold?: string, @Body('end_threshold') endThreshold?: string) {
    const teacher_id = req.user._id || req.user.id;
    return this.sessionService.create(classId, teacher_id, lateThreshold, endThreshold);
  }

  @ApiOperation({ summary: 'Update session thresholds' })
  @ApiOkResponse({ type: Session })
  @Post(':id')
  update(@Param('id') id: string, @Body() body: { late_threshold?: string, end_threshold?: string }, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.sessionService.update(id, body, teacher_id);
  }

  @ApiOperation({ summary: 'Get all sessions for a class' })
  @ApiOkResponse({ type: Session, isArray: true })
  @Get()
  findAll(@Query('classId') classId: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.sessionService.findAll(teacher_id, classId);
  }

  @ApiOperation({ summary: 'Get the active session for today' })
  @ApiOkResponse({ type: Session })
  @Get('today/:classId')
  findToday(@Param('classId') classId: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.sessionService.findTodaySession(teacher_id, classId);
  }

  @ApiOperation({ summary: 'Get detailed info for a single session' })
  @ApiOkResponse({ type: Session })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.sessionService.findOne(id, teacher_id);
  }

  @ApiOperation({ summary: 'Delete a session' })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any, @Body('archive') archive?: boolean) {
    const teacher_id = req.user._id || req.user.id;
    return this.sessionService.remove(id, teacher_id, archive !== false);
  }
}