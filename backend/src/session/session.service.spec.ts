import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionService } from './session.service';
import { Session } from './entities/session.entity';
import { ClassStudent } from '../class-student/entities/class-student.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { MinioService } from '../minio/minio.service';
import { Repository } from 'typeorm';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepo: Repository<Session>;

  const mockSessionRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    manager: {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
      }),
    },
  };

  const mockClassStudentRepo = {
    find: jest.fn(),
  };

  const mockAttendanceRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockMinioService = {
    // Thêm các hàm mock nếu cần
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(ClassStudent),
          useValue: mockClassStudentRepo,
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: mockAttendanceRepo,
        },
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepo = module.get<Repository<Session>>(getRepositoryToken(Session));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verify()', () => {
    it('should return valid: false if session is not found', async () => {
      // @ts-ignore
      mockSessionRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.verify('invalid-id');
      expect(result).toEqual({ valid: false });
    });

    it('should return valid: true if session is created today (same VN Date)', async () => {
      // Mock giờ hệ thống đang là 10:00 sáng ngày 08/05/2026
      jest.useFakeTimers().setSystemTime(new Date('2026-05-08T03:00:00.000Z')); // 10:00 VN

      const mockSession = {
        id: 'session-id',
        created_at: new Date('2026-05-08T01:00:00.000Z'), // Tạo lúc 08:00 VN cùng ngày
        end_threshold: null,
      };
      // @ts-ignore
      mockSessionRepo.findOne.mockResolvedValueOnce(mockSession as any);

      const result = await service.verify('session-id');
      expect(result).toEqual({ valid: true });
    });

    it('should return valid: false if session was created yesterday (Midnight Boundary Test)', async () => {
      // Mock giờ hệ thống đang là 00:05 sáng ngày 09/05/2026 (Qua ngày mới)
      jest.useFakeTimers().setSystemTime(new Date('2026-05-08T17:05:00.000Z')); // 00:05 VN (09/05)

      const mockSession = {
        id: 'session-id',
        created_at: new Date('2026-05-08T16:58:00.000Z'), // Tạo lúc 23:58 VN (08/05) - Ngày hôm qua
        end_threshold: null,
      };
      // @ts-ignore
      mockSessionRepo.findOne.mockResolvedValueOnce(mockSession as any);

      const result = await service.verify('session-id');
      expect(result).toEqual({ valid: false }); // Phải bị từ chối
    });

    it('should return valid: false if current time exceeds end_threshold', async () => {
      // Mock giờ hệ thống đang là 10:30 sáng ngày 08/05/2026
      jest.useFakeTimers().setSystemTime(new Date('2026-05-08T03:30:00.000Z'));

      const mockSession = {
        id: 'session-id',
        created_at: new Date('2026-05-08T01:00:00.000Z'), 
        end_threshold: new Date('2026-05-08T03:00:00.000Z'), // Kết thúc lúc 10:00 sáng VN
      };
      // @ts-ignore
      mockSessionRepo.findOne.mockResolvedValueOnce(mockSession as any);

      const result = await service.verify('session-id');
      expect(result).toEqual({ valid: false }); // Phải bị từ chối do quá hạn end_threshold
    });
  });
});
