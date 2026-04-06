import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { MinioService } from '../minio/minio.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly minioService: MinioService,
    private readonly aiService: AiService,
  ) {}

  findAll(teacherId?: string) {
    if (teacherId) {
      return this.studentRepo.find({
        where: { teacher_id: teacherId },
        order: { created_at: 'DESC' },
      });
    }
    return this.studentRepo.find({ order: { created_at: 'DESC' } });
  }

  findOne(id: string, teacherId?: string) {
    const where: any = { id };
    if (teacherId) where.teacher_id = teacherId;
    return this.studentRepo.findOne({
      where,
      relations: ['classStudents', 'classStudents.classEntity'],
    });
  }

  create(data: { name: string; student_code: string; email?: string; teacher_id?: string }) {
    data.student_code = data.student_code.replace(/\s+/g, '');
    data.name = data.name.trim();
    if (data.email) data.email = data.email.trim();
    const student = this.studentRepo.create(data);
    return this.studentRepo.save(student);
  }

  async createBulk(students: Array<{ name: string; student_code: string; email?: string; teacher_id?: string }>) {
    const results: Student[] = [];
    for (const data of students) {
      // 1. Sanitize and Extract
      let student_code = String(data.student_code || '').toString().trim().replace(/\s+/g, '');
      const name = String(data.name || '').trim();
      const email = data.email ? String(data.email).trim() : null;
      const teacher_id = data.teacher_id;

      if (!student_code || !name) continue;

      // Ensure student_code is consistent (e.g., uppercase if that's the convention, but let's keep it as is for now)
      // but remove any non-printable characters or whitespace.
      
      let student = await this.studentRepo.findOne({ where: { student_code } });
      
      if (!student) {
        // Create new student with explicit fields
        student = this.studentRepo.create({
          name,
          student_code,
          email: email as any,
          teacher_id
        });
        student = await this.studentRepo.save(student);
      } else {
        // Update existing student
        let updated = false;
        if (student.name !== name) {
          student.name = name;
          updated = true;
        }
        // Only update email if provided and different
        if (email && student.email !== email) {
          student.email = email;
          updated = true;
        }
        if (updated) {
          student = await this.studentRepo.save(student);
        }
      }
      results.push(student);
    }
    return results;
  }

  async update(id: string, data: { name?: string; student_code?: string; email?: string }, teacherId: string) {
    const student = await this.findOne(id, teacherId);
    if (!student) throw new NotFoundException('Student not found or unauthorized');
    
    if (data.student_code) data.student_code = data.student_code.replace(/\s+/g, '');
    if (data.name) data.name = data.name.trim();
    if (data.email) data.email = data.email.trim();

    Object.assign(student, data);
    return this.studentRepo.save(student);
  }

  async remove(id: string, teacherId: string) {
    const student = await this.findOne(id, teacherId);
    if (!student) throw new NotFoundException('Student not found or unauthorized');
    
    // We intentionally DO NOT delete from MinIO here because the 
    // user explicitly requested to retain the image data for AI research
    // and manual dataset curation later.

    // However, we MUST remove them from the AI fast-matching memory to prevent
    // ghost attendances:
    await this.aiService.deleteFace(id).catch(console.error);

    return this.studentRepo.remove(student);
  }

  async registerFace(id: string, file: Express.Multer.File, teacherId: string) {
    const student = await this.findOne(id, teacherId);
    if (!student) throw new NotFoundException('Student not found or unauthorized');

    try {
      const fileName = `student-${id}-${Date.now()}.jpg`;
      const photoUrl = await this.minioService.uploadFile(file.buffer, fileName, file.mimetype);

      const aiResponse = await this.aiService.registerFace(id, file.buffer, file.originalname);
      // Retrieve descriptor if available in the parsed aiResponse
      const descriptor = (aiResponse as any).descriptor || (aiResponse as any).embedding || null;

      student.photo_url = photoUrl;
      if (descriptor) {
        student.face_descriptor = descriptor;
      }
      return this.studentRepo.save(student);
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to register face via AI Service');
    }
  }
}