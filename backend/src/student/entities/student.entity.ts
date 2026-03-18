export class StudentEntity {
  id: string;
  student_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth: Date;


  constructor(partial: Partial<StudentEntity>) {
    Object.assign(this, partial);
  }
}