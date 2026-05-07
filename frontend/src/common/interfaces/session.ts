import { AttendanceData } from './attendance';
import { ClassData } from './course';

export interface SessionData {
  id: string;
  classData: ClassData;
  late_threshold?: string | null;
  end_threshold?: string | null;
  attendances?: AttendanceData[];
  created_at: string;
}

export interface CreateSessionPayload {
  class_id: string;
  late_threshold?: string;
  end_threshold?: string;
}
