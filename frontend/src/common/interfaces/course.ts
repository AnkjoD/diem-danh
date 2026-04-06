export interface CourseData {
  id: string;
  name: string;
  teacher_id: string | null;
  created_at: string;
}

export interface CreateCoursePayload {
  name: string;
  teacher_id?: string;
}

export interface ClassData {
  id: string;
  name: string;
  type: 'theory' | 'practice' | 'both';
  course: CourseData;
  studentCount?: number;
  created_at: string;
}

export interface CreateClassPayload {
  name: string;
  type: 'theory' | 'practice' | 'both';
  course_id: string;
}
