
export class CourseEntity{

  course_name: string;
  section: string;
  term: string;
  teacher: string;
  student_list: string[];
  is_active: boolean;

  constructor(partial: Partial<CourseEntity>) {
    Object.assign(this, partial);
  }
}