import http from "@/common/utils/http";
import { CourseData, CreateCoursePayload } from "@/common/interfaces/course";

export const getCourses = async (): Promise<CourseData[]> => {
  const response = await http.get("/courses");
  return response.data;
};

export const createCourse = async (payload: CreateCoursePayload): Promise<CourseData> => {
  const response = await http.post("/courses", payload);
  return response.data;
};

export const deleteCourse = async (id: string): Promise<CourseData> => {
  const response = await http.delete(`/courses/${id}`);
  return response.data;
};
