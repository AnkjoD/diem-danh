export interface StudentData {
  id: string;
  name: string;
  student_code: string;
  email: string | null;
  teacher_id: string | null;
  face_descriptor: number[] | null;
  photo_url: string | null;
  created_at: string;
}

export interface CreateStudentPayload {
  name: string;
  student_code: string;
  email?: string;
  teacher_id?: string;
}

export interface AiRecognizeResponse {
  success: boolean;
  message: string;
  students?: StudentData[];
  distances?: number[];
}
