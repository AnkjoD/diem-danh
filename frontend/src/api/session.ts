import http from "@/common/utils/http";

export interface CreateSessionPayload {
  course_id: string;
  date: string;
  session_type: "THEORY" | "PRACTICE";
}

export const createSession = async (payload: CreateSessionPayload) => {
  const response = await http.post("/sessions", payload);
  return response.data;
};

export const getSessionsByCourse = async (courseId: string) => {
  const response = await http.get(`/sessions/course/${courseId}`);
  return response.data;
};
