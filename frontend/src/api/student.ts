import http from "@/common/utils/http";
import {
  AddStudentPayload,
  StudentData,
  AiRecognizeResponse,
} from "@/common/interfaces/student";
import { ApiResponse } from "@/common/interfaces/api-response";

export const getStudentsByCourse = async (
  courseId: string,
): Promise<StudentData[]> => {
  const response = await http.get<ApiResponse<StudentData[]>>(
    `/courses/${courseId}/students`,
  );
  return response.data.data;
};

export const addStudentWithFace = async (
  payload: AddStudentPayload,
): Promise<StudentData> => {
  const response = await http.post<ApiResponse<StudentData>>(
    "/students/register-face",
    payload,
  );
  return response.data.data;
};

export const recognizeFace = async (
  file: Blob,
  fileName: string,
): Promise<AiRecognizeResponse> => {
  const formData = new FormData();
  formData.append("file", file, fileName);

  const response = await http.post<AiRecognizeResponse>(
    "/student/recognize",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
};
