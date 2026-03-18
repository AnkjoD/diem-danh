import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
export type StudentDocument = Student & Document;
@Schema({ timestamps: true })
export class Student {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  student_id: string;

  @Prop({ required: true })
  full_name: string;

  @Prop({ required: true })
  date_of_birth: Date;

  @Prop()
  email: string;

  @Prop()
  phone: string;
 

}

export const StudentSchema = SchemaFactory.createForClass(Student);