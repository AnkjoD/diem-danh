import { Injectable, NotFoundException, ConflictException, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {  hash } from 'bcrypt';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { Teacher, TeacherDocument } from './schemas/teacher.schema';
import { TeacherEntity } from './entities/teacher.entity';

@Injectable()
@UseInterceptors(ClassSerializerInterceptor)
export class TeacherService {
  constructor(
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
  ) {}

  async create(createTeacherDto: CreateTeacherDto) {
    const existingTeacher = await this.teacherModel.findOne({
      $or: [{ email: createTeacherDto.email }],
    });

    if (existingTeacher) {
      throw new ConflictException('Email already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await hash(createTeacherDto.password, saltRounds);
    
    const newTeacherData = {
      ...createTeacherDto,
      password: hashedPassword,
    };

    const createdTeacher = await this.teacherModel.create(newTeacherData);
    return new TeacherEntity(createdTeacher);
  }

  async findAll(){
    return this.teacherModel.find().select('-password').lean().exec();
  }

  async findOne(id: string) {
    const teacher = await this.teacherModel.findById(id).exec();
    if (!teacher) {
      return null;
    }
    return teacher.toObject();
  }

  async findByEmail(email: string){
    const teacher = await this.teacherModel.findOne({ email }).exec();
    if (!teacher) {
      return null;
    }
    return teacher.toObject();
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto): Promise<TeacherEntity> {
    const updateData = { ...updateTeacherDto };


    const updatedTeacher = await this.teacherModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
      .lean()
      .exec();
      
    if (!updatedTeacher) {
      throw new NotFoundException(`Teacher #${id} not found`);
    }
    return new TeacherEntity(updatedTeacher);
  }

  async remove(id: string): Promise<TeacherEntity> {
    const deletedTeacher = await this.teacherModel.findByIdAndDelete(id).select('-password').exec();
    if (!deletedTeacher) {
      throw new NotFoundException(`Teacher #${id} not found`);
    }
    return new TeacherEntity(deletedTeacher);
  }
}