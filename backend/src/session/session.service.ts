import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Session } from './entities/session.entity';
import { ClassStudent } from '../class-student/entities/class-student.entity';
import { Attendance } from '../attendance/entities/attendance.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(ClassStudent)
    private readonly classStudentRepo: Repository<ClassStudent>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
  ) {}

  async create(classId: string, teacherId: string, lateThreshold?: string, endThreshold?: string) {
    // Correct way to find class with teacher_id
    const cls = await this.sessionRepo.manager.getRepository('ClassEntity').findOne({ 
      where: { id: classId, teacher_id: teacherId } 
    });
    if (!cls) throw new NotFoundException('Class not found or unauthorized');

    const session = this.sessionRepo.create({
      classData: { id: classId },
      session_id: Date.now().toString(),
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
      .andWhere('class.teacher_id = :teacherId', { teacherId })
      .orderBy('session.created_at', 'DESC');
      
    if (classId) {
      query.andWhere('session.class_id = :classId', { classId });
    }
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
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    return this.sessionRepo.findOne({
      where: {
        classData: { id: classId, teacher_id: teacherId },
        created_at: Between(startOfDay, endOfDay),
      },
      relations: ['classData', 'attendances', 'attendances.student'],
      order: { created_at: 'DESC' },
    });
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

  async remove(id: string, teacherId: string) {
    const session = await this.findOne(id, teacherId);
    if (!session) throw new NotFoundException('Session not found or unauthorized');
    return this.sessionRepo.remove(session);
  }
}