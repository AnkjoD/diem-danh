import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { AiService } from '../ai/ai.service';
import { MinioService } from '../minio/minio.service';
import { Session } from '../session/entities/session.entity';
import { ClassStudent } from '../class-student/entities/class-student.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(ClassStudent)
    private readonly classStudentRepo: Repository<ClassStudent>,
    private readonly aiService: AiService,
    private readonly minioService: MinioService,
  ) {}

  async recognizeFace(sessionId: string, file: Express.Multer.File, teacherId: string) {
    try {
      const aiResponse = await this.aiService.recognizeFace(file.buffer, file.originalname);
      
      const session = await this.sessionRepo.findOne({
        where: { id: sessionId, classData: { teacher_id: teacherId } },
        relations: ['classData']
      });

      if (!session || !session.classData) {
        return { success: false, message: 'Session or linked Class not found' };
      }

      // Check if session has ended
      if (session.end_threshold && new Date() > new Date(session.end_threshold)) {
        return { success: false, message: 'Buổi điểm danh đã kết thúc!' };
      }

      if (!aiResponse.student_ids || aiResponse.student_ids.length === 0) {
        return { success: false, message: 'No matching face found in current view' };
      }

      // 1. Single upload for the entire frame
      const fileName = `frame-${sessionId}-${Date.now()}.jpg`;
      const photoUrl = await this.minioService.uploadFile(file.buffer, fileName, file.mimetype);

      const recognizedStudents: any[] = [];
      const studentIds = Array.from(new Set(aiResponse.student_ids as string[]))
        .filter(id => id && id !== 'null' && id !== 'unknown');

      // 2. Process recognized students
      for (let i = 0; i < studentIds.length; i++) {
        const studentId = studentIds[i];
        
        // Ensure student is in this class
        const isEnrolled = await this.classStudentRepo.findOne({
          where: { 
            classEntity: { id: session.classData.id }, 
            student: { id: studentId } 
          },
          relations: ['student']
        });

        if (!isEnrolled) continue;

        let attendanceRecord = await this.attendanceRepo.findOne({
          where: { session: { id: sessionId }, student: { id: studentId } },
          relations: ['student'],
        });

        if (!attendanceRecord) {
          attendanceRecord = this.attendanceRepo.create({
            session: { id: sessionId },
            student: { id: studentId },
            status: 'absent',
          });
          attendanceRecord.student = isEnrolled.student;
        }

        if (attendanceRecord.status !== 'present' && attendanceRecord.status !== 'late') {
          // Check for late status
          const now = new Date();
          let newStatus: 'present' | 'late' = 'present';
          
          if (session.late_threshold && now > new Date(session.late_threshold)) {
            newStatus = 'late';
          }

          attendanceRecord.status = newStatus;
          attendanceRecord.recognized_at = now;
          attendanceRecord.captured_frame_url = photoUrl;
          await this.attendanceRepo.save(attendanceRecord);
        }

        recognizedStudents.push(attendanceRecord.student);
      }

      if (recognizedStudents.length === 0) {
        return { 
          success: false, 
          message: 'Faces recognized but NONE are enrolled in this class' 
        };
      }

      return {
        success: true,
        message: `Successfully recognized ${recognizedStudents.length} student(s)`,
        students: recognizedStudents,
        distances: aiResponse.distances,
      };
    } catch (e) {
      console.error('Error in recognizeFace:', e);
      if (e instanceof InternalServerErrorException) throw e;
      
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      if (errMsg.toLowerCase().includes('uuid')) {
         throw new InternalServerErrorException('Lỗi định dạng ID từ AI (UUID null). Hệ thống đã được cập nhật để bỏ qua các ID không hợp lệ.');
      }
      if (errMsg.toLowerCase().includes('refused') || errMsg.toLowerCase().includes('conn')) {
         throw new InternalServerErrorException('Không thể kết nối với dịch vụ AI hoặc Lưu trữ. Có thể dịch vụ đang khởi động...');
      }
      throw new InternalServerErrorException('Lỗi xử lý điểm danh khuôn mặt: ' + errMsg);
    }
  }

  async getAttendanceBySession(sessionId: string, teacherId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, classData: { teacher_id: teacherId } },
      relations: ['classData']
    });
    if (!session) throw new NotFoundException('Session not found or unauthorized');

    return this.attendanceRepo.find({
      where: { session: { id: sessionId } },
      relations: ['student'],
      order: { created_at: 'ASC' },
    });
  }

  async markAttendanceManual(sessionId: string, studentId: string, status: string, teacherId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, classData: { teacher_id: teacherId } },
      relations: ['classData']
    });
    if (!session) throw new NotFoundException('Session not found or unauthorized');

    const record = await this.attendanceRepo.findOne({
      where: { session: { id: sessionId }, student: { id: studentId } }
    });
    if (!record) throw new NotFoundException('Attendance record not found');
    
    record.status = status;
    return this.attendanceRepo.save(record);
  }

  async removeAttendanceRecord(sessionId: string, studentId: string, teacherId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, classData: { teacher_id: teacherId } },
      relations: ['classData']
    });
    if (!session) throw new NotFoundException('Session not found or unauthorized');

    const record = await this.attendanceRepo.findOne({
      where: { session: { id: sessionId }, student: { id: studentId } }
    });
    if (!record) throw new NotFoundException('Attendance record not found');

    if (record.captured_frame_url) {
      try {
        const urlParts = record.captured_frame_url.split('/');
        const filename = urlParts[urlParts.length - 1]; // e.g. "dataset-ID-timestamp.jpg"
        if (filename) await this.minioService.deleteFile(filename);
      } catch (e) {
        console.error('Failed to delete file from MinIO', e);
      }
    }

    record.status = 'absent';
    record.recognized_at = null as any;
    record.captured_frame_url = null as any;
    return this.attendanceRepo.save(record);
  }
}