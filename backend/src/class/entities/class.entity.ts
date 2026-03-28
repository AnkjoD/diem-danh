import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { ClassStudent } from '../../class-student/entities/class-student.entity';
import { Session } from '../../session/entities/session.entity';

@Entity('classes')
export class ClassEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'teacher_id', nullable: true })
  teacher_id: string;

  @Column({ type: 'varchar', length: 50, default: 'theory' })
  type: string;

  @ManyToOne(() => Course, (course) => course.classes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => ClassStudent, (cs) => cs.classEntity)
  classStudents: ClassStudent[];

  @OneToMany(() => Session, (session) => session.classData)
  sessions: Session[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
