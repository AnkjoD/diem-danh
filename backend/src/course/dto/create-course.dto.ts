import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { CourseType } from '~/common/enums/course-type.enum';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  course_name: string;

  @IsString()
  @IsNotEmpty()
  term: string;

  @IsEnum(CourseType)
  course_type: CourseType;
}