import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash } from 'bcrypt';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { Teacher } from './entities/teacher.entity';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher) private teacherRepo: Repository<Teacher>,
  ) {}

  async create(createTeacherDto: CreateTeacherDto) {
    const existingTeacher = await this.teacherRepo.findOne({
      where: { email: createTeacherDto.email }
    });

    if (existingTeacher) {
      throw new ConflictException('Email đã tồn tại');
    }

    const saltRounds = 10;
    const hashedPassword = await hash(createTeacherDto.password, saltRounds);
    
    const teacher = this.teacherRepo.create({
      ...createTeacherDto,
      password: hashedPassword,
    });

    return this.teacherRepo.save(teacher);
  }

  async findAll() {
    return this.teacherRepo.find();
  }

  async findOne(id: string) {
    const teacher = await this.teacherRepo.findOne({ where: { id } });
    if (!teacher) return null;
    return teacher;
  }

  async findByEmail(email: string) {
    const teacher = await this.teacherRepo.findOne({ where: { email } });
    if (!teacher) return null;
    return teacher;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    const teacher = await this.findOne(id);
    if (!teacher) throw new NotFoundException(`Teacher #${id} not found`);

    if (updateTeacherDto.password) {
      updateTeacherDto.password = await hash(updateTeacherDto.password, 10);
    }
    
    Object.assign(teacher, updateTeacherDto);
    return this.teacherRepo.save(teacher);
  }

  async remove(id: string) {
    const teacher = await this.findOne(id);
    if (!teacher) throw new NotFoundException(`Teacher #${id} not found`);
    return this.teacherRepo.remove(teacher);
  }
}