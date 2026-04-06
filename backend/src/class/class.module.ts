import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { ClassEntity } from './entities/class.entity';
import { ClassStudent } from '../class-student/entities/class-student.entity';
import { StudentModule } from '../student/student.module';

@Module({
  imports: [TypeOrmModule.forFeature([ClassEntity, ClassStudent]), StudentModule],
  controllers: [ClassController],
  providers: [ClassService],
  exports: [ClassService]
})
export class ClassModule {}
