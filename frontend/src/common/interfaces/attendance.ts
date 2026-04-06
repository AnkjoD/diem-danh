import { StudentData } from './student';
import { SessionData } from './session';

export interface AttendanceData {
  id: string;
  status: 'present' | 'absent' | 'late';
  recognized_at: string | null;
  session: SessionData;
  student: StudentData;
  created_at: string;
}

export interface MarkAttendanceManualPayload {
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late';
}
