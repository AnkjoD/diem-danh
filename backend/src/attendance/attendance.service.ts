import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
  ) {}

  async markAttendance(data: MarkAttendanceDto) {
    const record = await this.attendanceModel.findOneAndUpdate(
      { session_id: data.session_id, student_id: data.student_id },
      { 
        status: data.status,
        check_in_time: new Date()
      },
      { new: true, upsert: true }
    ).lean();

    return record;
  }

  async getAttendanceBySession(sessionId: string) {
    return this.attendanceModel
      .find({ session_id: sessionId })
      .populate('student_id', 'full_name student_id image_url')
      .lean();
  }
}