import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CourseType } from '~/common/enums/course-type.enum';

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true })
  course_name: string; 

  @Prop({ required: true })
  term: string; 

  @Prop({ required: true, enum: CourseType, default: CourseType.BOTH })
  course_type: CourseType;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacher: Types.ObjectId | string;

  @Prop({ type: [String], default: [] })
  student_list: string[]; 

  @Prop({ default: true })
  is_active: boolean;
}

export const CourseSchema = SchemaFactory.createForClass(Course);