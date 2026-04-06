import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ClassStudent } from '../../class-student/entities/class-student.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'teacher_id', nullable: true })
  teacher_id: string;

  @Column()
  name: string;

  @Column({ name: 'student_code', unique: true })
  student_code: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'jsonb', name: 'face_descriptor', nullable: true })
  face_descriptor: number[];

  @Column({ name: 'photo_url', nullable: true })
  photo_url: string;

  @OneToMany(() => ClassStudent, (cs) => cs.student)
  classStudents: ClassStudent[];

  @OneToMany(() => Attendance, (attendance) => attendance.student)
  attendances: Attendance[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}