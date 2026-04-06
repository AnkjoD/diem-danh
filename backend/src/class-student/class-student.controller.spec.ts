import { Test, TestingModule } from '@nestjs/testing';
import { ClassStudentController } from './class-student.controller';
import { ClassStudentService } from './class-student.service';

describe('ClassStudentController', () => {
  let controller: ClassStudentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassStudentController],
      providers: [ClassStudentService],
    }).compile();

    controller = module.get<ClassStudentController>(ClassStudentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
