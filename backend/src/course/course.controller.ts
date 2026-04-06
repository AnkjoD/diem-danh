import { Controller, Get, Post, Body, Param, Delete, Req } from '@nestjs/common';
import { CourseService } from './course.service';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  create(@Body() body: { name: string }, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.courseService.create({ ...body, teacher_id });
  }

  @Get()
  findAll(@Req() req: any) {
    const teacher_id = req.user._id;
    return this.courseService.findAll(teacher_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.courseService.findOne(id, teacher_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.courseService.remove(id, teacher_id);
  }
}