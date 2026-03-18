import { Module } from '@nestjs/common';
import {MongooseModule} from "@nestjs/mongoose";
import {Course, CourseSchema} from "./schemas/course.schema";
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { Student } from '~/student/schemas/student.schema';


@Module({
    imports: [MongooseModule.forFeature([{name: Course.name, schema: CourseSchema}, {name: Student.name, schema: CourseSchema}])],
    controllers: [CourseController],
    providers: [CourseService],
    exports: [CourseService, MongooseModule]
})
export class CourseModule {}
