import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiOkResponse, ApiCreatedResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Controller, Get, Post, Patch, Body, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentService } from './student.service';
import { Student } from './entities/student.entity';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @ApiOperation({ summary: 'Create a new student' })
  @ApiCreatedResponse({ type: Student })
  @Post()
  create(@Body() body: { name: string; student_code: string; email?: string }, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.studentService.create({ ...body, teacher_id });
  }

  @ApiOperation({ summary: 'Bulk create students' })
  @ApiCreatedResponse({ type: [Student] })
  @Post('bulk')
  createBulk(@Body('students') students: any[], @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    const mapped = students.map(s => ({ ...s, teacher_id }));
    return this.studentService.createBulk(mapped);
  }

  @ApiOperation({ summary: 'Get all students' })
  @ApiOkResponse({ type: [Student] })
  @Get()
  findAll(@Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.studentService.findAll(teacher_id);
  }

  @ApiOperation({ summary: 'Get a specific student by ID' })
  @ApiOkResponse({ type: Student })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.studentService.findOne(id, teacher_id);
  }

  @ApiOperation({ summary: 'Update student info' })
  @ApiOkResponse({ type: Student })
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const teacher_id = req.user._id || req.user.id;
    return this.studentService.update(id, data, teacher_id);
  }

  @ApiOperation({ summary: 'Delete or archive a student' })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any, @Body('archive') archive?: boolean) {
    const teacher_id = req.user._id || req.user.id;
    return this.studentService.remove(id, teacher_id, archive !== false);
  }

  @ApiOperation({ summary: 'Upload a photo to register a student face' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post(':id/face')
  @UseInterceptors(FileInterceptor('file'))
  registerFace(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const teacher_id = req.user._id || req.user.id;
    return this.studentService.registerFace(id, file, teacher_id);
  }
}