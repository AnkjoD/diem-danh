import { IsMongoId, IsNotEmpty, IsEnum } from 'class-validator';
import { AttendanceStatus } from '~/common/enums/attendance-status.enum';

export class MarkAttendanceDto {
  @IsMongoId()
  @IsNotEmpty()
  session_id: string;

  @IsMongoId()
  @IsNotEmpty()
  student_id: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}