import http from "@/common/utils/http";
import { StudentData, CreateStudentPayload } from "@/common/interfaces/student";

export const getStudents = async (): Promise<StudentData[]> => {
  const response = await http.get("/students");
  return response.data;
};

export const createStudent = async (payload: CreateStudentPayload): Promise<StudentData> => {
  const response = await http.post("/students", payload);
  return response.data;
};

export const updateStudent = async (id: string, payload: Partial<CreateStudentPayload>): Promise<StudentData> => {
  const response = await http.patch(`/students/${id}`, payload);
  return response.data;
};

export const createBulkStudents = async (students: any[]): Promise<StudentData[]> => {
  const response = await http.post("/students/bulk", { students });
  return response.data;
};

export const deleteStudent = async (id: string, archive: boolean = true): Promise<StudentData> => {
  const response = await http.delete(`/students/${id}`, { data: { archive } });
  return response.data;
};

export const registerStudentFace = async (id: string, file: File): Promise<StudentData> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await http.post(`/students/${id}/face`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
