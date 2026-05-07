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

export const getAttendanceMatrix = async (classId: string) => {
  const response = await http.get(`/attendances/matrix/${classId}`);
  return response.data;
};

export const getAttendanceWarnings = async (classId: string) => {
  const response = await http.get(`/attendances/warnings/${classId}`);
  return response.data;
};

export const exportAttendanceToExcel = async (classId: string, className: string = 'report') => {
  const response = await http.get(`/attendances/export/${classId}`, {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Homura_Attendance_${className}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const removeAttendance = async (payload: { session_id: string, student_id: string, archive?: boolean }) => {
  const response = await http.post("/attendances/remove", payload);
  return response.data;
};
