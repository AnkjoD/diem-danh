export interface MarkAttendancePayload {
  session_id: string;
  student_id: string;
  status: "PRESENT" | "ABSENT" | "LATE";
}
