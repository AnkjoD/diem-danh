import { IsMongoId, IsNotEmpty, IsEnum, IsDateString } from 'class-validator';
import { SessionType } from '~/common/enums/session-type.enum';

export class CreateSessionDto {
  @IsMongoId()
  @IsNotEmpty()
  course_id: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;
  
  @IsNotEmpty()
  period: string;
  
  @IsEnum(SessionType)
  session_type: SessionType;
}