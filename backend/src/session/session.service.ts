import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull } from 'typeorm';
import { Session } from './entities/session.entity';
import { ClassStudent } from '../class-student/entities/class-student.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(ClassStudent)
    private readonly classStudentRepo: Repository<ClassStudent>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    private readonly minioService: MinioService,
  ) {}

  async create(classId: string, teacherId: string, lateThreshold?: string, endThreshold?: string) {
    // Correct way to find class with teacher_id
    const cls = await this.sessionRepo.manager.getRepository('ClassEntity').findOne({ 
      where: { id: classId, teacher_id: teacherId } 
    });
    if (!cls) throw new NotFoundException('Class not found or unauthorized');

    // KIỂM TRA: Nếu đã có phiên cho lớp này hôm nay rồi thì dùng lại phiên đó
    const existingToday = await this.findTodaySession(teacherId, classId);
    if (existingToday) {
      return existingToday;
    }

    const session = this.sessionRepo.create({
      classData: { id: classId },
      late_threshold: lateThreshold ? new Date(lateThreshold) : null as any,
      end_threshold: endThreshold ? new Date(endThreshold) : null as any,
    });
    const savedSession = await this.sessionRepo.save(session);

    const classStudents = await this.classStudentRepo.find({
      where: { classEntity: { id: classId } },
      relations: ['student'],
    });

    const attendanceRecords = classStudents.map(cs => {
      return this.attendanceRepo.create({
        session: { id: savedSession.id },
        student: { id: cs.student.id },
        status: 'absent',
      });
    });

    if (attendanceRecords.length > 0) {
      await this.attendanceRepo.save(attendanceRecords);
    }

    return savedSession;
  }

  findAll(teacherId: string, classId?: string) {
    const query = this.sessionRepo.createQueryBuilder('session')
      .leftJoinAndSelect('session.classData', 'class')
      .leftJoinAndSelect('session.attendances', 'attendances')
      .leftJoinAndSelect('attendances.student', 'student')
      .where('class.teacher_id = :teacherId', { teacherId });

    if (classId) {
      query.andWhere('class.id = :classId', { classId });
    }

    query.orderBy('session.created_at', 'DESC');
    
    return query.getMany();
  }

  findOne(id: string, teacherId?: string) {
    const where: any = { id };
    if (teacherId) where.classData = { teacher_id: teacherId };
    return this.sessionRepo.findOne({
      where,
      relations: ['classData', 'attendances', 'attendances.student'],
    });
  }

  async findTodaySession(teacherId: string, classId: string) {
    const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7
    const nowUtc = Date.now();

    // Tính ngày hiện tại theo giờ VN
    const nowInVN = new Date(nowUtc + VN_OFFSET_MS);

    // Tính đầu ngày VN (00:00:00) và cuối ngày VN (23:59:59) theo UTC
    const startUtc = new Date(Date.UTC(
      nowInVN.getUTCFullYear(),
      nowInVN.getUTCMonth(),
      nowInVN.getUTCDate(),
      -7, 0, 0, 0  // Giờ 0 VN = Giờ -7 UTC (tức là 17:00 UTC ngày hôm trước)
    ));
    const endUtc = new Date(Date.UTC(
      nowInVN.getUTCFullYear(),
      nowInVN.getUTCMonth(),
      nowInVN.getUTCDate(),
      16, 59, 59, 999  // Giờ 23:59 VN = Giờ 16:59 UTC
    ));

    const todaySession = await this.sessionRepo.createQueryBuilder('session')
      .leftJoinAndSelect('session.classData', 'class')
      .leftJoinAndSelect('session.attendances', 'attendance')
      .leftJoinAndSelect('attendance.student', 'student')
      .where('class.id = :classId', { classId })
      .andWhere('class.teacher_id = :teacherId', { teacherId })
      .andWhere('session.created_at BETWEEN :start AND :end', { 
        start: startUtc, 
        end: endUtc 
      })
      .orderBy('session.created_at', 'DESC')
      .getOne();

    return todaySession || null;
  }

  async update(id: string, data: { late_threshold?: string, end_threshold?: string }, teacherId: string) {
    const session = await this.findOne(id, teacherId);
    if (!session) throw new NotFoundException('Session not found or unauthorized');
    
    if (data.late_threshold !== undefined) {
      session.late_threshold = data.late_threshold ? new Date(data.late_threshold) : null as any;
    }
    if (data.end_threshold !== undefined) {
      session.end_threshold = data.end_threshold ? new Date(data.end_threshold) : null as any;
    }
    return this.sessionRepo.save(session);
  }

  async remove(id: string, teacherId: string, archive: boolean = true) {
    const session = await this.findOne(id, teacherId);
    if (!session) throw new NotFoundException('Session not found or unauthorized');

    // 1. Process attendance frames
    try {
      const recordsWithPhotos = await this.attendanceRepo.find({
        where: { session: { id }, captured_frame_url: Not(IsNull()) },
      });

      for (const record of recordsWithPhotos) {
        if (record.captured_frame_url) {
          const bucketMatch = record.captured_frame_url.match(/\:9000\/([^\/]+)\//);
          const sourceBucket = bucketMatch ? bucketMatch[1] : this.minioService.buckets.frames;
          const fullKey = record.captured_frame_url.split(`/${sourceBucket}/`)[1];

          if (fullKey) {
            if (archive) {
              await this.minioService.moveFile(
                fullKey, 
                fullKey, 
                sourceBucket, 
                this.minioService.buckets.deleted
              );
            } else {
              await this.minioService.deleteFile(fullKey, sourceBucket);
            }
          }
        }
      }
    } catch (e) {
      // Process failure silently or handle appropriately
    }

    return this.sessionRepo.remove(session);
  }
  async verify(id: string) {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) return { valid: false };

    const now = new Date();

    // Chỉ vô hiệu hóa khi đã qua end_threshold (giờ kết thúc),
    // không vô hiệu hóa chỉ vì qua ngày (học sinh vẫn có thể nộp ảnh muộn)
    if (session.end_threshold && now > new Date(session.end_threshold)) {
      return { valid: false };
    }

    return { valid: true };
  }

}