import { Controller, Get, Post, Patch, Body, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentService } from './student.service';

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  create(@Body() body: { name: string; student_code: string; email?: string }, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.studentService.create({ ...body, teacher_id });
  }

  @Post('bulk')
  createBulk(@Body('students') students: any[], @Req() req: any) {
    const teacher_id = req.user._id;
    const mapped = students.map(s => ({ ...s, teacher_id }));
    return this.studentService.createBulk(mapped);
  }

  @Get()
  findAll(@Req() req: any) {
    const teacher_id = req.user._id;
    return this.studentService.findAll(teacher_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.studentService.findOne(id, teacher_id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.studentService.update(id, data, teacher_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id;
    return this.studentService.remove(id, teacher_id);
  }

  @Post(':id/face')
  @UseInterceptors(FileInterceptor('file'))
  registerFace(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const teacher_id = req.user._id;
    return this.studentService.registerFace(id, file, teacher_id);
  }
}