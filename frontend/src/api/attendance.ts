import { MarkAttendancePayload } from "@/common/interfaces/attendance";
import http from "@/common/utils/http";

export const markStudentAttendance = async (payload: MarkAttendancePayload) => {
  const response = await http.post("/attendance/mark", payload);
  return response.data;
};
