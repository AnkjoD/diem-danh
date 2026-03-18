import http from "@/common/utils/http";
import { ApiResponse } from "@/common/interfaces/api-response";
import { CourseData, CreateCoursePayload } from "@/common/interfaces/course";

export const getCourses = async (): Promise<CourseData[]> => {
  const response = await http.get<ApiResponse<CourseData[]>>("/courses");
  return response.data.data;
};

export const getCourseById = async (id: string): Promise<CourseData> => {
  const response = await http.get<ApiResponse<CourseData>>(`/courses/${id}`);
  return response.data.data;
};

export const createCourse = async (
  payload: CreateCoursePayload,
): Promise<CourseData> => {
  const response = await http.post<ApiResponse<CourseData>>(
    "/courses",
    payload,
  );
  return response.data.data;
};

export const addStudentsToCourse = async (
  courseId: string,
  students: any[],
) => {
  const response = await http.post(`/courses/${courseId}/students`, {
    students,
  });
  return response.data;
};
