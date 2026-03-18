import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AttendanceStatus } from '~/common/enums/attendance-status.enum';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session_id: Types.ObjectId | string;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student_id: Types.ObjectId | string;

  @Prop({ required: true, enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Prop({ default: Date.now })
  check_in_time: Date;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);