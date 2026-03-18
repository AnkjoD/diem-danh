import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { AppAuthGuard } from '~/auth/guards/app-auth.guard';

@Controller('sessions')
@UseGuards(AppAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  async createSession(@Body() body: CreateSessionDto) {
    const result = await this.sessionService.createSession(body);
    return result;
  }

  @Get('course/:courseId')
  async getSessions(@Param('courseId') courseId: string) {
    const sessions = await this.sessionService.getSessionsByCourseId(courseId);
    return sessions;
  }
}