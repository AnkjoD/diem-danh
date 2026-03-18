import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from './schemas/student.schema';
import { Course, CourseDocument } from '~/course/schemas/course.schema';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<Student>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

  async upsertStudent(dto: CreateStudentDto, imageUrl: string) {
    const student = await this.studentModel.findOneAndUpdate(
      { student_id: dto.student_id },
      { 
        full_name: dto.full_name,
        date_of_birth: new Date(dto.date_of_birth),
        email: dto.email,
        phone: dto.phone,
        image_url: imageUrl,
      },
      { new: true, upsert: true }
    ).lean();

    if (dto.course_id) {
      await this.courseModel.findByIdAndUpdate(
        dto.course_id,
        { $addToSet: { student_list: student._id } }
      );
    }

    return student;
  }

  async findAll() {
    return this.studentModel.find().exec();
  }

  public async deleteStudent(studentId: string): Promise<boolean> {
    const result = await this.studentModel.deleteOne({ student_id: studentId }).exec();
    return result.deletedCount > 0;
  }

  async findByStudentId(studentId: string) {
    return this.studentModel.findOne({ student_id: studentId }).exec();
  }

  async getStudentsByCourse(courseId: string) {
    const course = await this.courseModel.findById(courseId).lean();
    if (!course || !course.student_list.length) return [];

    return this.studentModel.find({ _id: { $in: course.student_list } }).lean();
  }
}