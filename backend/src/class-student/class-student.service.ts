import { Injectable } from '@nestjs/common';
import { CreateClassStudentDto } from './dto/create-class-student.dto';
import { UpdateClassStudentDto } from './dto/update-class-student.dto';

@Injectable()
export class ClassStudentService {
  create(createClassStudentDto: CreateClassStudentDto) {
    return 'This action adds a new classStudent';
  }

  findAll() {
    return `This action returns all classStudent`;
  }

  findOne(id: number) {
    return `This action returns a #${id} classStudent`;
  }

  update(id: number, updateClassStudentDto: UpdateClassStudentDto) {
    return `This action updates a #${id} classStudent`;
  }

  remove(id: number) {
    return `This action removes a #${id} classStudent`;
  }
}
