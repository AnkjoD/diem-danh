import { Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In} from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { AiService } from '../ai/ai.service';
import { MinioService } from '../minio/minio.service';
import { Session } from '../session/entities/session.entity';
import { ClassStudent } from '../class-student/entities/class-student.entity';
import { ClassEntity } from '../class/entities/class.entity';
import * as sharp from 'sharp';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(ClassStudent)
    private readonly classStudentRepo: Repository<ClassStudent>,
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    private readonly aiService: AiService,
    private readonly minioService: MinioService,
  ) {}

  /**
   * Nhận diện đồng thời từ nhiều ảnh
   */
  async recognizeFaces(sessionId: string, files: Express.Multer.File[]) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['classData']
    });

    if (!session || !session.classData) {
      return { success: false, message: 'Session or linked Class not found' };
    }

    const now = new Date();
    const vnTimeZone = 'Asia/Ho_Chi_Minh';
    const todayStr = now.toLocaleDateString('sv-SE', { timeZone: vnTimeZone });
    
    // Kiểm tra xem phiên này có thuộc về ngày hôm nay (giờ VN) hay không
    const sessionDateStr = new Date(session.created_at).toLocaleDateString('sv-SE', { timeZone: vnTimeZone });

    if (sessionDateStr !== todayStr) {
      return { success: false, message: 'Phiên điểm danh này đã hết hạn (chỉ có hiệu lực trong ngày tạo).' };
    }

    if (session.end_threshold && now > new Date(session.end_threshold)) {
      return { success: false, message: 'Buổi điểm danh đã kết thúc (đã quá giờ kết thúc)!' };
    }

    // Chỉ giữ lại quy tắc khóa theo ngày (isToday đã kiểm tra ở trên)
    // Miễn là trong cùng một ngày, giảng viên có thể điểm danh bao lâu tùy ý.

    const allRecognizedStudents: any[] = [];
    let totalMatchedButNotEnrolled = 0;
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
        if (result.matchedButNotEnrolled) {
          totalMatchedButNotEnrolled += result.matchedButNotEnrolled;
        }
      } catch (e) {
        console.error('Error processing file:', e);
      }
      aggregatedResults.filesProcessed++;
    }

    const uniqueStudents = Array.from(new Map(allRecognizedStudents.map(s => [s.id, s])).values());
    aggregatedResults.students = uniqueStudents as any;
    
    if (aggregatedResults.success) {
      aggregatedResults.message = `Đã xử lý ${files.length} ảnh. Nhận diện được ${uniqueStudents.length} sinh viên thuộc lớp này.`;
      if (totalMatchedButNotEnrolled > 0) {
        aggregatedResults.message += ` (Có ${totalMatchedButNotEnrolled} khuôn mặt đúng nhưng sinh viên không thuộc lớp này nên bị bỏ qua)`;
      }
    } else {
      if (totalMatchedButNotEnrolled > 0) {
        aggregatedResults.message = `AI có nhận diện được ${totalMatchedButNotEnrolled} khuôn mặt, NHƯNG các sinh viên này KHÔNG CÓ TÊN TRONG LỚP nên bị từ chối điểm danh! (Vui lòng thêm sinh viên vào lớp trước)`;
      } else {
        aggregatedResults.message = 'Không tìm thấy khuôn mặt nào khớp trong các ảnh đã tải lên.';
      }
    }

    return aggregatedResults;
  }

  private async processSingleFile(session: Session, file: Express.Multer.File) {
    let processedBuffer = file.buffer;
    try {
      processedBuffer = await sharp(file.buffer).rotate().toBuffer();
    } catch (e) {
      console.error('[ROTATION] Failed to auto-rotate image buffer with sharp:', e);
    }

    const aiResponse: any = await this.aiService.recognizeFace(processedBuffer, file.originalname);
    
    if (!aiResponse.student_ids || aiResponse.student_ids.length === 0) {
      return { success: false, students: [], matchedButNotEnrolled: 0 };
    }

    // 1. TẢI ẢNH GỐC (RAW) LÊN MINIO - Duy nhất 1 tấm để tiết kiệm bộ nhớ
    // Dùng created_at của session làm mốc thời gian định danh cho thư mục/file
    const sessionTs = new Date(session.created_at).getTime();
    const rawFileName = `frame-${sessionTs}-${Date.now()}.jpg`;
    
    // Lấy kích thước ảnh gốc để frontend vẽ ô vuông chính xác
    let imgMetadata = { width: 0, height: 0 };
    try {
      const meta = await sharp(processedBuffer).metadata();
      imgMetadata.width = meta.width || 0;
      imgMetadata.height = meta.height || 0;
    } catch (e) {
      console.error('Failed to get image metadata', e);
    }

    const photoUrl = await this.minioService.uploadFile(
      processedBuffer, 
      rawFileName, 
      file.mimetype, 
      this.minioService.buckets.frames
    );

    const studentIds = aiResponse.student_ids as string[];
    const recognizedStudents: any[] = [];

    console.log(`[RECOGNIZE] Class ID being checked: ${session.classData.id}`);
    console.log(`[RECOGNIZE] AI returned student IDs: ${JSON.stringify(studentIds)}`);
    console.log(`[RECOGNIZE] AI distances: ${JSON.stringify(aiResponse.distances)}`);

    let matchedButNotEnrolled = 0;

    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i];
      const bbox = aiResponse.bboxes ? aiResponse.bboxes[i] : null;

      console.log(`[RECOGNIZE] Checking enrollment: student=${studentId} in class=${session.classData.id}`);

      const isEnrolled = await this.classStudentRepo.findOne({
        where: { classEntity: { id: session.classData.id }, student: { id: studentId } },
        relations: ['student']
      });

      console.log(`[RECOGNIZE] Enrollment result: ${isEnrolled ? `FOUND (student: ${isEnrolled.student?.name})` : 'NOT FOUND'}`);

      if (!isEnrolled) {
        matchedButNotEnrolled++;
        continue;
      }

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

      // Cập nhật thông tin điểm danh và metadata huấn luyện
      const now = new Date();
      if (record.status !== 'present' && record.status !== 'late') {
        let newStatus: 'present' | 'late' = 'present';
        if (session.late_threshold && now > new Date(session.late_threshold)) {
          newStatus = 'late';
        }
        record.status = newStatus;
        record.recognized_at = now;
      }
      
      // Luôn cập nhật ảnh mới nhất và tọa độ khuôn mặt để phục vụ Dataset
      record.captured_frame_url = photoUrl; // Bây giờ là ảnh sạch (Raw)
      record.training_metadata = { 
        bbox, 
        confidence: aiResponse.confidences ? aiResponse.confidences[i] : 1.0,
        imgWidth: imgMetadata.width,
        imgHeight: imgMetadata.height
      };
      
      await this.attendanceRepo.save(record);
      
      if (!recognizedStudents.find(s => s.id === record.student.id)) {
        recognizedStudents.push(record.student);
      }
    }

    return { 
      success: recognizedStudents.length > 0, 
      students: recognizedStudents,
      matchedButNotEnrolled,
      photoUrl: photoUrl,
      bboxes: aiResponse.bboxes,
      imgWidth: imgMetadata.width,
      imgHeight: imgMetadata.height
    };
  }

  async getClassAttendanceMatrix(classId: string, teacherId: string) {
    const skipAuth = process.env.SKIP_AUTH === 'true';
    const where: any = { id: classId };
    if (!skipAuth) where.teacher_id = teacherId;

    const classData = await this.classRepo.findOne({
      where,
      relations: ['sessions', 'classStudents', 'classStudents.student']
    });
    if (!classData) throw new NotFoundException('Class not found');

    const sessions = await this.sessionRepo.find({
      where: { classData: { id: classId } },
      order: { created_at: 'ASC' }
    });

    const studentRecords = classData.classStudents.map(cs => cs.student);
    const attendanceRecords = await this.attendanceRepo.find({
      where: { session: { classData: { id: classId } } },
      relations: ['session', 'student']
    });

    // Build Matrix: StudentID -> SessionID -> Status
    const matrix = {};
    attendanceRecords.forEach(att => {
      if (!matrix[att.student.id]) matrix[att.student.id] = {};
      matrix[att.student.id][att.session.id] = {
        status: att.status,
        time: att.recognized_at,
        frame: att.captured_frame_url
      };
    });

    return { sessions, students: studentRecords, matrix };
  }

  async getAttendanceWarnings(classId: string, teacherId: string, threshold: number = 0.2) {
    const skipAuth = process.env.SKIP_AUTH === 'true';
    const where: any = { id: classId };
    if (!skipAuth) where.teacher_id = teacherId;

    const classData = await this.classRepo.findOne({ where });
    if (!classData) return [];

    const sessions = await this.sessionRepo.find({ where: { classData: { id: classId } } });
    const totalSessions = sessions.length;
    if (totalSessions === 0) return [];

    const students = await this.classStudentRepo.find({
      where: { classEntity: { id: classId } },
      relations: ['student']
    });

    const warnings: any[] = [];
    for (const s of students) {
      const absences = await this.attendanceRepo.count({
        where: { student: { id: s.student.id }, session: { classData: { id: classId } }, status: 'absent' }
      });
      const attendanceCount = await this.attendanceRepo.count({
         where: { student: { id: s.student.id }, session: { classData: { id: classId } }, status: In(['present', 'late']) }
      });
      
      // Tính toán dựa trên số buổi đã diễn ra
      const missingCount = totalSessions - attendanceCount;
      const missingRatio = missingCount / totalSessions;

      if (missingRatio >= threshold) {
        warnings.push({
          student: s.student,
          missingCount,
          totalSessions,
          ratio: Math.round(missingRatio * 100)
        });
      }
    }
    return warnings;
  }

  async exportClassToExcel(classId: string, teacherId: string) {
    const { sessions, students, matrix } = await this.getClassAttendanceMatrix(classId, teacherId);
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Báo cáo Chuyên cần');

    // Title & Meta
    sheet.mergeCells('A1:C1');
    sheet.getCell('A1').value = 'BÁO CÁO ĐIỂM DANH SINH TRẮC HỌC - HOMURA';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: '7C3AED' } };

    // Headers
    const sessionHeaders = sessions.map(s => {
      const d = new Date(s.created_at);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    });
    const headers = ['STT', 'Mã Sinh Viên', 'Họ và Tên', ...sessionHeaders, 'Tổng Có Mặt', 'Tổng Muộn', 'Tổng Vắng', 'Tỉ Lệ Vắng (%)'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
      cell.font = { color: { argb: 'FFFFFF' }, bold: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Content
    students.forEach((student, idx) => {
      let present = 0;
      let late = 0;
      let absent = 0;

      const sessionData = sessions.map(s => {
        const att = matrix[student.id]?.[s.id];
        if (!att || att.status === 'absent') { absent++; return 'Vắng'; }
        if (att.status === 'late') { late++; return `Muộn (${new Date(att.time).toLocaleTimeString('vi-VN')})`; }
        present++; return 'Có mặt';
      });

      const total = present + late + absent;
      const absentRate = total > 0 ? Math.round((absent / total) * 100) : 0;

      const rowData = [
        idx + 1,
        student.student_code,
        student.name,
        ...sessionData,
        present,
        late,
        absent,
        `${absentRate}%`
      ];
      const row = sheet.addRow(rowData);
      
      // Color coding statuses
      row.eachCell((cell, colNumber) => {
        if (colNumber > 3) {
          if (cell.value === 'Vắng') cell.font = { color: { argb: 'F43F5E' }, bold: true };
          if (cell.value?.toString().includes('Muộn')) cell.font = { color: { argb: 'FBBF24' } };
          if (cell.value === 'Có mặt') cell.font = { color: { argb: '10B981' } };
        }
      });
    });

    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 25;
    sessions.forEach((_, i) => sheet.getColumn(i+4).width = 15);

    return workbook.xlsx.writeBuffer();
  }

  async getAttendanceBySession(sessionId: string, teacherId: string) {
    const skipAuth = process.env.SKIP_AUTH === 'true';
    const where: any = { id: sessionId };
    if (!skipAuth) where.classData = { teacher_id: teacherId };

    const session = await this.sessionRepo.findOne({
      where,
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
      if (status === 'absent') return { success: true };
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
          if (archive) await this.minioService.moveFile(fullKey, fullKey, sourceBucket, this.minioService.buckets.deleted);
          else await this.minioService.deleteFile(fullKey, sourceBucket);
        }
      } catch (e) {}
    }

    record.status = 'absent';
    record.recognized_at = null as any;
    record.captured_frame_url = null as any;
    return this.attendanceRepo.save(record);
  }
}