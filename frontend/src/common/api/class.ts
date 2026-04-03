import http from "@/common/utils/http";
import { ClassData, CreateClassPayload } from "@/common/interfaces/course";
import { StudentData } from "@/common/interfaces/student";

export const getClasses = async (courseId?: string): Promise<ClassData[]> => {
  const url = courseId ? `/classes?courseId=${courseId}` : "/classes";
  const response = await http.get(url);
  return response.data;
};

export const createClass = async (payload: CreateClassPayload): Promise<ClassData> => {
  const response = await http.post("/classes", payload);
  return response.data;
};

export const deleteClass = async (id: string): Promise<ClassData> => {
  const response = await http.delete(`/classes/${id}`);
  return response.data;
};

export const getAssignedStudents = async (classId: string): Promise<StudentData[]> => {
  const response = await http.get(`/classes/${classId}/students/assigned`);
  return response.data;
};

export const assignStudent = async (classId: string, studentId: string) => {
  const response = await http.post(`/classes/${classId}/students/${studentId}`);
  return response.data;
};

export const assignBulkStudents = async (classId: string, students: any[], sync: boolean = false) => {
  const response = await http.post(`/classes/${classId}/students/bulk`, { students, sync });
  return response.data;
};

export const unassignStudent = async (classId: string, studentId: string) => {
  const response = await http.delete(`/classes/${classId}/students/${studentId}`);
  return response.data;
};
