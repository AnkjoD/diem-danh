import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { Attendance } from './entities/attendance.entity';
import { Session } from '../session/entities/session.entity';
import { ClassStudent } from '../class-student/entities/class-student.entity';
import { ClassEntity } from '../class/entities/class.entity';
import { AiService } from '../ai/ai.service';
import { MinioService } from '../minio/minio.service';

describe('AttendanceService', () => {
  let service: AttendanceService;

  const mockAttendanceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockSessionRepo = {
    findOne: jest.fn(),
  };

  const mockClassStudentRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockClassRepo = {
    findOne: jest.fn(),
  };

  const mockAiService = {
    recognizeFace: jest.fn(),
  };

  const mockMinioService = {
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: getRepositoryToken(Attendance), useValue: mockAttendanceRepo },
        { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
        { provide: getRepositoryToken(ClassStudent), useValue: mockClassStudentRepo },
        { provide: getRepositoryToken(ClassEntity), useValue: mockClassRepo },
        { provide: AiService, useValue: mockAiService },
        { provide: MinioService, useValue: mockMinioService },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recognizeFaces', () => {
    it('should reject if session does not exist', async () => {
      // @ts-ignore
      mockSessionRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.recognizeFaces('session-1', [], 'teacher-1');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Session or linked Class not found');
    });

    it('should reject if session was created yesterday (Midnight Boundary)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-09T08:00:00.000Z')); // May 9, 15:00 VN
      const oldSession = {
        id: 'session-1',
        classData: { id: 'class-1', teacher_id: 'teacher-1' },
        created_at: new Date('2026-05-08T16:58:00.000Z'), // May 8, 23:58 VN
      };
      
      // @ts-ignore
      mockSessionRepo.findOne.mockResolvedValueOnce(oldSession);

      const result = await service.recognizeFaces('session-1', [], 'teacher-1');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Phiên điểm danh này đã hết hạn');
    });

    it('should reject if current time exceeds end_threshold', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-09T10:00:00.000Z')); 
      const session = {
        id: 'session-1',
        classData: { id: 'class-1', teacher_id: 'teacher-1' },
        created_at: new Date('2026-05-09T08:00:00.000Z'),
        end_threshold: new Date('2026-05-09T09:30:00.000Z'), // Đã hết hạn lúc 9h30
      };
      
      // @ts-ignore
      mockSessionRepo.findOne.mockResolvedValueOnce(session);

      const result = await service.recognizeFaces('session-1', [], 'teacher-1');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Buổi điểm danh đã kết thúc');
    });
  });

  describe('markAttendanceManual', () => {
    it('should mark student as present manually', async () => {
      const session = {
        id: 'session-1',
        classData: { id: 'class-1', teacher_id: 'teacher-1' },
        created_at: new Date(),
        late_threshold: null,
      };
      // @ts-ignore
      mockSessionRepo.findOne.mockResolvedValueOnce(session);

      const attendanceRecord = { id: 'att-1', status: 'absent' };
      // @ts-ignore
      mockAttendanceRepo.findOne.mockResolvedValueOnce(attendanceRecord);

      // @ts-ignore
      mockAttendanceRepo.save.mockResolvedValueOnce({ ...attendanceRecord, status: 'present' });

      const result = await service.markAttendanceManual('session-1', 'student-1', 'present', 'teacher-1');
      
      expect(mockAttendanceRepo.save).toHaveBeenCalled();
      // @ts-ignore
      expect(result.status).toBe('present');
    });
  });
});
