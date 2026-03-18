
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SessionType } from '~/common/enums/session-type.enum';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course_id: string | Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({required: true, enum: SessionType, default: SessionType.THEORY})
  session_type: SessionType;
}

export const SessionSchema = SchemaFactory.createForClass(Session);