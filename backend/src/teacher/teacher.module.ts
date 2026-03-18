import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { Teacher, TeacherSchema } from './schemas/teacher.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Teacher.name, schema: TeacherSchema }])],
  controllers: [TeacherController],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeacherModule {}