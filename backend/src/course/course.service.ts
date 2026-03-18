import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { Student, StudentDocument } from '~/student/schemas/student.schema';
import { CreateStudentDto } from '~/student/dto/create-student.dto';

@Injectable()
export class CourseService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
  ) {}

  async createCourse(data: CreateCourseDto, teacherId: string) {
    const newCourse = await this.courseModel.create({
      course_name: data.course_name,
      term: data.term,
      course_type: data.course_type,
      teacher: teacherId,
      student_list: [], 
      is_active: true,
    });

    return newCourse;
  }

  async getCoursesByTeacher(teacherId: string) {
    const courses = await this.courseModel.find({ teacher: teacherId }).sort({ createdAt: -1 }).lean();
    console.log(courses);
    return courses;
  }

  async getCourseById(courseId: string, teacherId: string) {
    const course = await this.courseModel.findOne({ _id: courseId, teacher: teacherId }).populate('student_list').lean();
    if (!course) throw new NotFoundException();
    return course;
  }

  async addStudentsToCourse(courseId: string, data: { students: CreateStudentDto[] }, teacherId: string) {
    const course = await this.courseModel.findOne({ _id: courseId, teacher: teacherId });
    if (!course) throw new NotFoundException();

    const studentObjectIds: Types.ObjectId[] = [];

    for (const studentData of data.students) {
      let student = await this.studentModel.findOne({ student_id: studentData.student_id });
      
      if (!student) {
        student = await this.studentModel.create({
          student_id: studentData.student_id,
          full_name: studentData.full_name,
          email: studentData.email,
          
        });
      studentObjectIds.push(student._id);
     }
    }

    const updatedCourse = await this.courseModel.findByIdAndUpdate(
      courseId,
      { $addToSet: { student_list: { $each: studentObjectIds } } },
      { new: true }
    ).populate('student_list');

    return updatedCourse;
  }
}