import { Exclude, Expose, Transform } from 'class-transformer';
import { Types } from 'mongoose';

export class TeacherEntity {
  @Expose()
  @Transform(({ value }: { value: string | Types.ObjectId }) => value?.toString())
  _id: string | Types.ObjectId;

  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;

  @Exclude()
  password: string;

  @Exclude()
  __v: number;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  constructor(partial: Partial<TeacherEntity>) {
    Object.assign(this, partial);
  }
}