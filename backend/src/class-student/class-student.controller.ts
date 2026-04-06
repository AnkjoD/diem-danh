import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClassStudentService } from './class-student.service';
import { CreateClassStudentDto } from './dto/create-class-student.dto';
import { UpdateClassStudentDto } from './dto/update-class-student.dto';

@Controller('class-student')
export class ClassStudentController {
  constructor(private readonly classStudentService: ClassStudentService) {}

  @Post()
  create(@Body() createClassStudentDto: CreateClassStudentDto) {
    return this.classStudentService.create(createClassStudentDto);
  }

  @Get()
  findAll() {
    return this.classStudentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classStudentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClassStudentDto: UpdateClassStudentDto) {
    return this.classStudentService.update(+id, updateClassStudentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classStudentService.remove(+id);
  }
}
