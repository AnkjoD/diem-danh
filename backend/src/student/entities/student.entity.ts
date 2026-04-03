import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ClassStudent } from '../../class-student/entities/class-student.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('students')
export class Student {
  @ApiProperty({ example: '3c0a9d8e-1234-4a0d-9a66-b060f75490b4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '03904e0a-fff9-4cb5-894f-d05188eabe93' })
  @Column({ name: 'teacher_id', nullable: true })
  teacher_id: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @Column()
  name: string;

  @ApiProperty({ example: '20211234', description: 'Unique student identifier' })
  @Column({ name: 'student_code', unique: true })
  student_code: string;

  @ApiProperty({ example: 'student@example.com', required: false })
  @Column({ nullable: true })
  email: string;

  @ApiProperty({ example: '0912345678', required: false })
  @Column({ nullable: true })
  phone: string;

  @ApiProperty({ example: [0.123, -0.456], description: 'Face descriptor numerical vector', required: false })
  @Column({ type: 'jsonb', name: 'face_descriptor', nullable: true })
  face_descriptor: number[];

  @ApiProperty({ example: 'http://localhost:9000/students/student_id/photo.jpg', required: false })
  @Column({ name: 'photo_url', nullable: true })
  photo_url: string;

  @OneToMany(() => ClassStudent, (cs) => cs.student)
  classStudents: ClassStudent[];

  @OneToMany(() => Attendance, (attendance) => attendance.student)
  attendances: Attendance[];

  @ApiProperty({ example: '2026-03-22T07:25:16Z' })
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}