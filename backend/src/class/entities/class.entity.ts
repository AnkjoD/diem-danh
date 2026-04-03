import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { ClassStudent } from '../../class-student/entities/class-student.entity';
import { Session } from '../../session/entities/session.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('classes')
export class ClassEntity {
  @ApiProperty({ example: '13fdec56-b641-4c44-b644-a145ef76cffc' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '68CS1' })
  @Column()
  name: string;

  @ApiProperty({ example: '03904e0a-fff9-4cb5-894f-d05188eabe93' })
  @Column({ name: 'teacher_id', nullable: true })
  teacher_id: string;

  @ApiProperty({ example: 'theory', enum: ['theory', 'practice'] })
  @Column({ type: 'varchar', length: 50, default: 'theory' })
  type: string;

  @ManyToOne(() => Course, (course) => course.classes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => ClassStudent, (cs) => cs.classEntity)
  classStudents: ClassStudent[];

  @OneToMany(() => Session, (session) => session.classData)
  sessions: Session[];

  @ApiProperty({ example: '2026-03-22T07:25:16Z' })
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
