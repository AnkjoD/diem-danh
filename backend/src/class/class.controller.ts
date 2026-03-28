import { Controller, Get, Post, Body, Param, Delete, Query, Req } from '@nestjs/common';
import { ClassService } from './class.service';

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  create(@Body() body: { name: string; type: string; course_id: string }, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.classService.create({ ...body, teacher_id });
  }

  @Get()
  findAll(@Query('courseId') courseId: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.classService.findAll(teacher_id, courseId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.classService.findOne(id, teacher_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.classService.remove(id, teacher_id);
  }

  @Get(':id/students/assigned')
  getAssignedStudents(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.classService.getAssignedStudents(id, teacher_id);
  }

  @Post(':id/students/:studentId')
  assignStudent(@Param('id') id: string, @Param('studentId') studentId: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.classService.assignStudent(id, studentId, teacher_id);
  }

  @Post(':id/students/bulk')
  assignBulkStudents(@Param('id') id: string, @Body('students') students: any[], @Req() req: any) {
    const teacher_id = req.user._id;
    return this.classService.assignBulkStudents(id, students, teacher_id);
  }

  @Delete(':id/students/:studentId')
  unassignStudent(@Param('id') id: string, @Param('studentId') studentId: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.classService.unassignStudent(id, studentId, teacher_id);
  }
}
