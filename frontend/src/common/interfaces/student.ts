export interface StudentData {
  id: string;
  name: string;
  student_code: string;
  email: string | null;
  phone: string | null;
  teacher_id: string | null;
  face_descriptor: number[] | null;
  photo_url: string | null;
  registered_photos: string[] | null;
  created_at: string;
}

export interface CreateStudentPayload {
  name: string;
  student_code: string;
  email?: string;
  phone?: string;
  teacher_id?: string;
}

export interface AiRecognizeResponse {
  success: boolean;
  message: string;
  students?: StudentData[];
  distances?: number[];
}
