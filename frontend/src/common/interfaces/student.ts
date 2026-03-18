export interface StudentData {
  _id: string;
  student_id: string;
  full_name: string;
  date_of_birth?: string;
  email?: string;
  phone?: string;
  image_url?: string;
}

export interface AddStudentPayload {
  course_id: string;
  student_id: string;
  full_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  images: string[];
}

export interface AiRecognizeResponse {
  status: string;
  student_id: string | null;
  distance: number | null;
  message: string;
  full_name: string | null;
}
