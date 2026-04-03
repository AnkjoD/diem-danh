import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Delete, Req } from '@nestjs/common';
import { CourseService } from './course.service';
import { Course } from './entities/course.entity';

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @ApiOperation({ summary: 'Create a new course' })
  @ApiCreatedResponse({ type: Course })
  @Post()
  create(@Body() body: { name: string }, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.courseService.create({ ...body, teacher_id });
  }

  @ApiOperation({ summary: 'Get all courses for the teacher' })
  @ApiOkResponse({ type: [Course] })
  @Get()
  findAll(@Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.courseService.findAll(teacher_id);
  }

  @ApiOperation({ summary: 'Get details of a specific course' })
  @ApiOkResponse({ type: Course })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.courseService.findOne(id, teacher_id);
  }

  @ApiOperation({ summary: 'Delete a course' })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.courseService.remove(id, teacher_id);
  }
}