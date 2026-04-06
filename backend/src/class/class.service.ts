import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from './entities/class.entity';
import { ClassStudent } from '../class-student/entities/class-student.entity';
import { StudentService } from '../student/student.service';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(ClassStudent)
    private readonly classStudentRepo: Repository<ClassStudent>,
    private readonly studentService: StudentService,
  ) {}

  findAll(teacherId?: string, courseId?: string) {
    const query = this.classRepo.createQueryBuilder('class')
      .leftJoinAndSelect('class.course', 'course')
      .loadRelationCountAndMap('class.studentCount', 'class.classStudents')
      .orderBy('class.created_at', 'ASC');

    if (teacherId) {
      query.andWhere('class.teacher_id = :teacherId', { teacherId });
    }

    if (courseId) {
      query.andWhere('class.course_id = :courseId', { courseId });
    }

    return query.getMany();
  }

  findOne(id: string, teacherId?: string) {
    const where: any = { id };
    if (teacherId) where.teacher_id = teacherId;
    return this.classRepo.findOne({
      where,
      relations: ['course', 'classStudents', 'classStudents.student'],
    });
  }

  async create(data: { name: string; type: string; course_id: string; teacher_id?: string }) {
    if (data.type === 'both') {
      const existingTheory = await this.classRepo.findOne({ where: { name: data.name, type: 'theory', course: { id: data.course_id } } });
      const existingPractice = await this.classRepo.findOne({ where: { name: data.name, type: 'practice', course: { id: data.course_id } } });
      
      const newClasses: ClassEntity[] = [];
      if (!existingTheory) {
        newClasses.push(this.classRepo.create({ 
          name: data.name, 
          type: 'theory', 
          course: { id: data.course_id },
          teacher_id: data.teacher_id
        }));
      }
      if (!existingPractice) {
        newClasses.push(this.classRepo.create({ 
          name: data.name, 
          type: 'practice', 
          course: { id: data.course_id },
          teacher_id: data.teacher_id
        }));
      }

      if (newClasses.length > 0) {
        return this.classRepo.save(newClasses);
      }
      return [existingTheory, existingPractice].filter(Boolean);
    }

    const existing = await this.classRepo.findOne({ where: { name: data.name, type: data.type, course: { id: data.course_id } } });
    if (existing) {
      return existing;
    }

    const cls = this.classRepo.create({
      name: data.name,
      type: data.type,
      course: { id: data.course_id },
      teacher_id: data.teacher_id,
    });
    return this.classRepo.save(cls);
  }

  async remove(id: string, teacherId: string) {
    const cls = await this.findOne(id, teacherId);
    if (!cls) throw new NotFoundException('Class not found or unauthorized');
    return this.classRepo.remove(cls);
  }

  // Student Assignment Methods
  async getAssignedStudents(classId: string, teacherId: string) {
    const cls = await this.findOne(classId, teacherId);
    if (!cls) throw new NotFoundException('Class not found or unauthorized');

    const records = await this.classStudentRepo.find({
      where: { classEntity: { id: classId } },
      relations: ['student'],
    });
    return records.map(r => r.student);
  }

  async assignStudent(classId: string, studentId: string, teacherId: string) {
    const cls = await this.findOne(classId, teacherId);
    if (!cls) throw new NotFoundException('Class not found or unauthorized');

    const student = await this.studentService.findOne(studentId, teacherId);
    if (!student) throw new NotFoundException('Student not found or unauthorized');

    const existing = await this.classStudentRepo.findOne({
      where: { classEntity: { id: classId }, student: { id: studentId } }
    });
    if (existing) return existing;

    const assignment = this.classStudentRepo.create({
      classEntity: { id: classId },
      student: { id: studentId }
    });
    return this.classStudentRepo.save(assignment);
  }

  async assignBulkStudents(classId: string, students: any[], teacherId: string) {
    const cls = await this.findOne(classId, teacherId);
    if (!cls) throw new NotFoundException('Class not found or unauthorized');

    // 1. Bulk Upsert the students into DB with teacher_id
    const mapped = students.map(s => ({ ...s, teacher_id: teacherId }));
    const upsertedStudents = await this.studentService.createBulk(mapped);
    
    const results: any[] = [];
    // 2. Map and ensure they are all in the class (skip duplicates)
    for (const student of upsertedStudents) {
      const existing = await this.classStudentRepo.findOne({
        where: { classEntity: { id: classId }, student: { id: student.id } }
      });
      if (!existing) {
        const assignment = this.classStudentRepo.create({
          classEntity: { id: classId },
          student: { id: student.id }
        });
        await this.classStudentRepo.save(assignment);
      }
      results.push(student);
    }
    return results;
  }

  async unassignStudent(classId: string, studentId: string, teacherId: string) {
    const cls = await this.findOne(classId, teacherId);
    if (!cls) throw new NotFoundException('Class not found or unauthorized');

    const assignment = await this.classStudentRepo.findOne({
      where: { classEntity: { id: classId }, student: { id: studentId } }
    });
    if (assignment) {
      return this.classStudentRepo.remove(assignment);
    }
  }
}
