import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { Student } from './entities/student.entity';
import { MinioModule } from '../minio/minio.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student]),
    MinioModule,
    AiModule,
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService]
})
export class StudentModule {}
