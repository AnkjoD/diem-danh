import { IsString, IsNotEmpty, IsEmail, IsOptional,  IsBoolean, MinLength } from 'class-validator';


export class CreateTeacherDto {

  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}