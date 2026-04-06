import { Module } from '@nestjs/common';
import { ClassStudentService } from './class-student.service';
import { ClassStudentController } from './class-student.controller';

@Module({
  controllers: [ClassStudentController],
  providers: [ClassStudentService],
})
export class ClassStudentModule {}
