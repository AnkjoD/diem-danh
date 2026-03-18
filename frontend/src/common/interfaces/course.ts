export interface CourseData {
  _id: string;
  course_name: string;
  term: string;
  course_type: string;
  student_list: string[];
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCoursePayload {
  course_name: string;
  term: string;
  course_type: string;
}
