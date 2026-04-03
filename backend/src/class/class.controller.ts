import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Delete, Query, Req } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassEntity } from './entities/class.entity';

@ApiTags('Classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @ApiOperation({ summary: 'Create a new class' })
  @ApiCreatedResponse({ type: ClassEntity })
  @Post()
  create(@Body() body: { name: string; type: string; course_id: string }, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.classService.create({ ...body, teacher_id });
  }

  @ApiOperation({ summary: 'Get all classes for a course' })
  @ApiOkResponse({ type: ClassEntity, isArray: true })
  @Get()
  findAll(@Query('courseId') courseId: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.classService.findAll(teacher_id, courseId);
  }

  @ApiOperation({ summary: 'Get details of a specific class' })
  @ApiOkResponse({ type: ClassEntity })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.classService.findOne(id, teacher_id);
  }

  @ApiOperation({ summary: 'Delete a class' })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.classService.remove(id, teacher_id);
  }

  @ApiOperation({ summary: 'Get students assigned to a class' })
  @Get(':id/students/assigned')
  getAssignedStudents(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.classService.getAssignedStudents(id, teacher_id);
  }

  @ApiOperation({ summary: 'Bulk assign students to a class' })
  @Post(':id/students/bulk')
  assignBulkStudents(@Param('id') id: string, @Body('students') students: any[], @Body('sync') sync: boolean, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.classService.assignBulkStudents(id, students, teacher_id, sync);
  }

  @ApiOperation({ summary: 'Assign a student to a class' })
  @Post(':id/students/:studentId')
  assignStudent(@Param('id') id: string, @Param('studentId') studentId: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.classService.assignStudent(id, studentId, teacher_id);
  }

  @ApiOperation({ summary: 'Unassign a student from a class' })
  @Delete(':id/students/:studentId')
  unassignStudent(@Param('id') id: string, @Param('studentId') studentId: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.classService.unassignStudent(id, studentId, teacher_id);
  }
}
