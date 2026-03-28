import { Test, TestingModule } from '@nestjs/testing';
import { ClassStudentService } from './class-student.service';

describe('ClassStudentService', () => {
  let service: ClassStudentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClassStudentService],
    }).compile();

    service = module.get<ClassStudentService>(ClassStudentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
