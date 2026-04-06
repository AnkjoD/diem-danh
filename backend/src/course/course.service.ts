import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
  ) {}

  findAll(teacherId?: string) {
    if (teacherId) {
      return this.courseRepo.find({ 
        where: { teacher_id: teacherId },
        order: { created_at: 'DESC' } 
      });
    }
    return this.courseRepo.find({ order: { created_at: 'DESC' } });
  }

  findOne(id: string, teacherId?: string) {
    if (teacherId) {
      return this.courseRepo.findOne({ 
        where: { id, teacher_id: teacherId }
      });
    }
    return this.courseRepo.findOne({ where: { id } });
  }

  create(data: { name: string; teacher_id?: string }) {
    const course = this.courseRepo.create(data);
    return this.courseRepo.save(course);
  }

  async remove(id: string, teacherId: string) {
    const course = await this.findOne(id, teacherId);
    if (!course) throw new NotFoundException('Course not found or unauthorized');
    return this.courseRepo.remove(course);
  }
}