import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { AppAuthGuard } from '~/auth/guards/app-auth.guard';
import { Request } from 'express';
import { CreateStudentDto } from '~/student/dto/create-student.dto';
export interface RequestWithUser extends Request {
    user: {
        _id: string;
    };
}
@Controller('courses')
@UseGuards(AppAuthGuard)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  async createCourse(
    @Body() body: CreateCourseDto, 
    @Req() req: RequestWithUser
  ) {
    const teacherId = req.user._id;
    console.log(teacherId);
    const result = await this.courseService.createCourse(body, teacherId);
    return result;
  }

  @Get()
  async getMyCourses(@Req() req: RequestWithUser) {
    const teacherId = req.user._id;

    const courses = await this.courseService.getCoursesByTeacher(teacherId);
    return courses;
  }

  @Get(':id')
  async getCourseDetail(
    @Param('id') id: string, 
    @Req() req: RequestWithUser
  ) {
    const teacherId = req.user._id;

    const course = await this.courseService.getCourseById(id, teacherId);
    return course;
  }

  @Post(':id/students')
  async addStudentsToCourse(
    @Param('id') courseId: string,
    @Body() body: {students: CreateStudentDto[]},
    @Req() req: RequestWithUser
  ) {
    const teacherId = req.user._id;
    return await this.courseService.addStudentsToCourse(courseId, body, teacherId);
  }
}