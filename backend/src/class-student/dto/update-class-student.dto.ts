import { PartialType } from '@nestjs/mapped-types';
import { CreateClassStudentDto } from './create-class-student.dto';

export class UpdateClassStudentDto extends PartialType(CreateClassStudentDto) {}
