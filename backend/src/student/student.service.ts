import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

  create(data: { name: string; student_code: string; email?: string; phone?: string; teacher_id?: string }) {
    data.student_code = data.student_code.replace(/\s+/g, '').toUpperCase();
    data.name = data.name.trim();
    if (data.email) data.email = data.email.trim();
    if (data.phone) data.phone = data.phone.trim();
    const student = this.studentRepo.create(data);
    return this.studentRepo.save(student);
  }

  async createBulk(students: Array<{ name: string; student_code: string; email?: string; phone?: string; teacher_id?: string }>) {
    const results: Student[] = [];
    
    // 1. Pre-sanitize and deduplicate by student_code
    const rawSanitized = students.map(s => ({
      name: String(s.name || '').trim(),
      student_code: String(s.student_code || '').trim().replace(/\s+/g, '').toUpperCase(),
      email: s.email ? String(s.email).trim() : null,
      phone: s.phone ? String(s.phone).trim() : null,
      teacher_id: s.teacher_id
    })).filter(s => s.student_code && s.name);

    if (rawSanitized.length === 0) return [];

    // Deduplicate internally (keep first occurrence)
    const uniqueMap = new Map();
    rawSanitized.forEach(s => {
      if (!uniqueMap.has(s.student_code)) uniqueMap.set(s.student_code, s);
    });
    const sanitizedStudents = Array.from(uniqueMap.values());
    const studentCodes = sanitizedStudents.map(s => s.student_code);

    // 2. Fetch all existing students in one go
    const existingStudents = await this.studentRepo.find({
      where: { student_code: In(studentCodes) }
    });
    
    const studentMap = new Map(existingStudents.map(s => [s.student_code, s]));
    const toSave: Student[] = [];

    for (const data of sanitizedStudents) {
      let student = studentMap.get(data.student_code);
      
      if (!student) {
        const newStudent = this.studentRepo.create({
          name: data.name,
          student_code: data.student_code,
          email: data.email,
          phone: data.phone,
          teacher_id: data.teacher_id
        });
        toSave.push(newStudent);
      } else {
        let updated = false;
        if (data.name && student.name !== data.name) {
          student.name = data.name;
          updated = true;
        }
        if (data.email && student.email !== data.email) {
          student.email = data.email;
          updated = true;
        }
        if (data.phone && student.phone !== data.phone) {
          student.phone = data.phone;
          updated = true;
        }
        if (updated) toSave.push(student);
        else results.push(student);
      }
    }

    if (toSave.length > 0) {
      const saved = await this.studentRepo.save(toSave);
      results.push(...saved);
    }

    return results;
  }

  async update(id: string, data: { name?: string; student_code?: string; email?: string; phone?: string }, teacherId: string) {
    const student = await this.findOne(id, teacherId);
    if (!student) throw new NotFoundException('Student not found or unauthorized');
    
    if (data.student_code) data.student_code = data.student_code.replace(/\s+/g, '').toUpperCase();
    if (data.name) data.name = data.name.trim();
    if (data.email) data.email = data.email.trim();
    if (data.phone) data.phone = data.phone.trim();

    Object.assign(student, data);
    return this.studentRepo.save(student);
  }

  async remove(id: string, teacherId: string, archive: boolean = true) {
    const student = await this.findOne(id, teacherId);
    if (!student) throw new NotFoundException('Student not found or unauthorized');
    
    // Handle photo archiving or deletion
    if (student.photo_url) {
      try {
        const bucketMatch = student.photo_url.match(/\:9000\/([^\/]+)\//);
        const sourceBucket = bucketMatch ? bucketMatch[1] : this.minioService.buckets.register;
        const fullKey = student.photo_url.split(`/${sourceBucket}/`)[1];
        
        if (fullKey) {
          if (archive) {
            // Move from current bucket to deleted bucket
            await this.minioService.moveFile(
                fullKey, 
                fullKey, 
                sourceBucket, 
                this.minioService.buckets.deleted
            );
          } else {
            // Delete permanently from current bucket
            await this.minioService.deleteFile(fullKey, sourceBucket);
          }
        }
      } catch (e) {
        // Handled silently

      }
    }

    // We MUST remove them from the AI fast-matching memory to prevent
    // ghost attendances:
    await this.aiService.deleteFace(id).catch(() => {});

    return this.studentRepo.remove(student);
  }

  async registerFace(id: string, file: Express.Multer.File, teacherId: string) {
    const student = await this.findOne(id, teacherId);
    if (!student) throw new NotFoundException('Student not found or unauthorized');

    try {
      const fileName = `student-${id}-${Date.now()}.jpg`;
      const photoUrl = await this.minioService.uploadFile(
        file.buffer, 
        fileName, 
        file.mimetype, 
        this.minioService.buckets.register
      );

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