import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
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

  /**
   * Nhận diện đồng thời từ nhiều ảnh
   */
  async recognizeFaces(sessionId: string, files: Express.Multer.File[], teacherId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, classData: { teacher_id: teacherId } },
      relations: ['classData']
    });

    if (!session || !session.classData) {
      return { success: false, message: 'Session or linked Class not found' };
    }

    if (session.end_threshold && new Date() > new Date(session.end_threshold)) {
      return { success: false, message: 'Buổi điểm danh đã kết thúc!' };
    }

    const allRecognizedStudents: any[] = [];
    const aggregatedResults = {
      success: false,
      message: '',
      students: [],
      filesProcessed: 0,
    };

    for (const file of files) {
      try {
        const result = await this.processSingleFile(session, file);
        if (result.success) {
          aggregatedResults.success = true;
          allRecognizedStudents.push(...result.students);
        }
      } catch (e) {
        // Skip individual file failure
      }
      aggregatedResults.filesProcessed++;
    }

    // Lọc trùng sinh viên
    const uniqueStudents = Array.from(new Map(allRecognizedStudents.map(s => [s.id, s])).values());
    aggregatedResults.students = uniqueStudents as any;
    aggregatedResults.message = aggregatedResults.success 
      ? `Đã xử lý ${files.length} ảnh. Nhận diện được ${uniqueStudents.length} sinh viên.`
      : 'Không tìm thấy khuôn mặt nào khớp trong các ảnh đã tải lên.';

    return aggregatedResults;
  }

  private async processSingleFile(session: Session, file: Express.Multer.File) {
    const aiResponse = await this.aiService.recognizeFace(file.buffer, file.originalname);
    
    if (!aiResponse.student_ids || aiResponse.student_ids.length === 0) {
      return { success: false, students: [] };
    }

    // Upload frame minh chứng
    const fileName = `frame-${session.id}-${Date.now()}.jpg`;
    const photoUrl = await this.minioService.uploadFile(
      file.buffer, 
      fileName, 
      file.mimetype, 
      this.minioService.buckets.frames
    );

    const studentIds = Array.from(new Set(aiResponse.student_ids as string[]))
      .filter(id => id && id !== 'null' && id !== 'unknown');

    const recognizedStudents: any[] = [];
    for (const studentId of studentIds) {
      const isEnrolled = await this.classStudentRepo.findOne({
        where: { classEntity: { id: session.classData.id }, student: { id: studentId } },
        relations: ['student']
      });

      if (!isEnrolled) continue;

      let record = await this.attendanceRepo.findOne({
        where: { session: { id: session.id }, student: { id: studentId } },
        relations: ['student'],
      });

      if (!record) {
        record = this.attendanceRepo.create({
          session: { id: session.id },
          student: { id: studentId },
          status: 'absent',
        });
        record.student = isEnrolled.student;
      }

      if (record.status !== 'present' && record.status !== 'late') {
        const now = new Date();
        let newStatus: 'present' | 'late' = 'present';
        if (session.late_threshold && now > new Date(session.late_threshold)) {
          newStatus = 'late';
        }

        record.status = newStatus;
        record.recognized_at = now;
        record.captured_frame_url = photoUrl;
        await this.attendanceRepo.save(record);
      }

      recognizedStudents.push(record.student);
    }

    return { success: recognizedStudents.length > 0, students: recognizedStudents };
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

  async markAttendanceManual(sessionId: string, student_id: string, status: string, teacherId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, classData: { teacher_id: teacherId } },
      relations: ['classData']
    });
    if (!session) throw new NotFoundException('Session not found or unauthorized');

    let record = await this.attendanceRepo.findOne({
      where: { session: { id: sessionId }, student: { id: student_id } },
      relations: ['student']
    });

    if (!record) {
      // Nếu đang vắng mà chuyển sang vắng nữa thì không làm gì
      if (status === 'absent') return { success: true };

      // Tìm thông tin enrollment để lấy Object Student
      const enrollment = await this.classStudentRepo.findOne({
        where: { classEntity: { id: session.classData.id }, student: { id: student_id } },
        relations: ['student']
      });
      if (!enrollment) throw new NotFoundException('Student not enrolled in this class');

      record = this.attendanceRepo.create({
        session: { id: sessionId },
        student: enrollment.student,
        status: status as any,
      });
    }

    if (status === 'absent') {
      return this.removeAttendanceRecord(sessionId, student_id, teacherId, false);
    }

    // Nếu chuyển sang Có/Muộn mà chưa có giờ nhận diện -> Gán giờ hiện tại
    if ((status === 'present' || status === 'late') && !record.recognized_at) {
      record.recognized_at = new Date();
    }

    record.status = status as any;
    return this.attendanceRepo.save(record);
  }

  async removeAttendanceRecord(sessionId: string, studentId: string, teacherId: string, archive: boolean = false) {
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
        const bucketMatch = record.captured_frame_url.match(/\:9000\/([^\/]+)\//);
        const sourceBucket = bucketMatch ? bucketMatch[1] : this.minioService.buckets.frames;
        const fullKey = record.captured_frame_url.split(`/${sourceBucket}/`)[1];
        
        if (fullKey) {
          if (archive) {
            await this.minioService.moveFile(fullKey, fullKey, sourceBucket, this.minioService.buckets.deleted);
          } else {
            await this.minioService.deleteFile(fullKey, sourceBucket);
          }
        }
      } catch (e) {
        // Silent fail for MinIO issues
      }
    }

    record.status = 'absent';
    record.recognized_at = null as any;
    record.captured_frame_url = null as any;
    return this.attendanceRepo.save(record);
  }
}