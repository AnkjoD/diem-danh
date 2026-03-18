import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from './schemas/student.schema';
import { StudentController } from './student.controller';
import { MinioModule } from '~/minio/minio.module';
import { AiModule } from '~/ai/ai.module';
import { Course, CourseSchema } from '~/course/schemas/course.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Student.name, schema: StudentSchema }, { name: Course.name, schema: CourseSchema }]),
    MinioModule,
    AiModule,
  ],
  providers: [StudentService],
  exports: [StudentService, MongooseModule],
  controllers: [StudentController],
})
export class StudentModule {}
