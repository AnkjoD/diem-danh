import http from "@/common/utils/http";
import { AttendanceData, MarkAttendanceManualPayload } from "@/common/interfaces/attendance";
import { AiRecognizeResponse } from "@/common/interfaces/student";

export const getAttendancesBySession = async (sessionId: string): Promise<AttendanceData[]> => {
  const response = await http.get(`/attendances/session/${sessionId}`);
  return response.data;
};

export const markAttendanceManual = async (payload: MarkAttendanceManualPayload): Promise<AttendanceData> => {
  const response = await http.post("/attendances/manual", payload);
  return response.data;
};

export const recognizeAttendanceFace = async (session_id: string, files: File[]): Promise<AiRecognizeResponse> => {
  const formData = new FormData();
  formData.append("session_id", session_id);
  files.forEach(file => {
    formData.append("files", file);
  });

  const response = await http.post("/attendances/recognize", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const removeAttendance = async (payload: { session_id: string, student_id: string, archive?: boolean }) => {
  const response = await http.post("/attendances/remove", payload);
  return response.data;
};
