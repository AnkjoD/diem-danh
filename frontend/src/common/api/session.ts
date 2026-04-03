import http from "@/common/utils/http";
import { CreateSessionPayload, SessionData } from "@/common/interfaces/session";

export const getSessions = async (classId?: string): Promise<SessionData[]> => {
  const url = classId ? `/sessions?classId=${classId}` : "/sessions";
  const response = await http.get(url);
  return response.data;
};

export const getTodaySession = async (classId: string): Promise<SessionData | null> => {
  const response = await http.get(`/sessions/today/${classId}`);
  return response.data;
};

export const createSession = async (payload: CreateSessionPayload): Promise<SessionData> => {
  const response = await http.post("/sessions", payload);
  return response.data;
};

export const deleteSession = async (id: string, archive: boolean = true): Promise<SessionData> => {
  const response = await http.delete(`/sessions/${id}`, { data: { archive } });
  return response.data;
};

export const updateSession = async (id: string, payload: { late_threshold?: string, end_threshold?: string }): Promise<SessionData> => {
  const response = await http.post(`/sessions/${id}`, payload);
  return response.data;
};
