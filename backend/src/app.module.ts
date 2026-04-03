import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { StudentModule } from "./student/student.module";
import { MinioModule } from "./minio/minio.module";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AttendanceModule } from './attendance/attendance.module';
import { AiModule } from './ai/ai.module';
import { TeacherModule } from './teacher/teacher.module';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './session/session.module';
import { APP_GUARD } from "@nestjs/core/constants";
import { AppAuthGuard } from "./auth/guards/app-auth.guard";
import { CourseModule } from "./course/course.module";

import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from "./course/entities/course.entity";
import { ClassEntity } from "./class/entities/class.entity";
import { ClassStudent } from "./class-student/entities/class-student.entity";
import { Student } from "./student/entities/student.entity";
import { Session } from "./session/entities/session.entity";
import { Attendance } from "./attendance/entities/attendance.entity";
import { Teacher } from "./teacher/entities/teacher.entity";
import { ClassStudentModule } from './class-student/class-student.module';
import { ClassModule } from './class/class.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DB_HOST'),
        port: configService.getOrThrow<number>('DB_PORT'),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_DATABASE'),
        entities: [Course, ClassEntity, ClassStudent, Student, Session, Attendance, Teacher],
        synchronize: true,
      }),
    }),
    StudentModule,
    MinioModule,
    AttendanceModule,
    AiModule,
    TeacherModule,
    AuthModule,
    SessionModule,
    CourseModule,

    ClassStudentModule,
    ClassModule
  ],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: AppAuthGuard,
  }],
})
export class AppModule {}
