  import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

  export class CreateStudentDto {
    @IsString()
    @IsNotEmpty()
    course_id: string;

    @IsString()
    @IsNotEmpty()
    student_id: string;

    @IsString()
    @IsNotEmpty()
    full_name: string;

    @IsString()
    @IsNotEmpty()
    date_of_birth: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    
  }