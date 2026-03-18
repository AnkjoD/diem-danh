import { Controller, Get,  Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AppAuthGuard } from '~/auth/guards/app-auth.guard';


@Controller('teacher')
@UseGuards(AppAuthGuard)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  findAll() {
    return this.teacherService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    return this.teacherService.update(id, updateTeacherDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teacherService.remove(id);
  }
}