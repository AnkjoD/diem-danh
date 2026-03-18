import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { StudentModule } from "./student/student.module";
import { MinioService } from "./minio/minio.service";
import { MinioModule } from "./minio/minio.module";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from '@nestjs/config';
import { AttendanceController } from './attendance/attendance.controller';
import { AttendanceModule } from './attendance/attendance.module';
import { AiService } from './ai/ai.service';
import { AiModule } from './ai/ai.module';
import { TeacherModule } from './teacher/teacher.module';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './session/session.module';
import { APP_GUARD } from "@nestjs/core/constants";
import { AppAuthGuard } from "./auth/guards/app-auth.guard";
import { CourseModule } from "./course/course.module";
@Module({
  imports: [
   
    MongooseModule.forRootAsync(
      {useFactory: () => ({
        uri: process.env.MONGODB_URI,
      }),}
    ),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
     StudentModule,
    MinioModule,
    AttendanceModule,
    AiModule,
    TeacherModule,
    AuthModule,
    SessionModule,
    CourseModule
    
  ],
  controllers: [AppController, AttendanceController],
  providers: [AppService, MinioService, AiService, {
    provide: APP_GUARD,
    useClass: AppAuthGuard,
  }],
})
export class AppModule {}
