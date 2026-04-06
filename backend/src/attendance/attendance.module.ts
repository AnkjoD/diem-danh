import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Attendance } from './entities/attendance.entity';
import { AiModule } from '../ai/ai.module';
import { MinioModule } from '../minio/minio.module';
import { Session } from '../session/entities/session.entity';
import { ClassStudent } from '../class-student/entities/class-student.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, Session, ClassStudent]),
    AiModule,
    MinioModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService]
})
export class AttendanceModule {}