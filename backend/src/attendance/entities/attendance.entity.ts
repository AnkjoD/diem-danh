import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Session } from '../../session/entities/session.entity';
import { Student } from '../../student/entities/student.entity';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['present', 'absent', 'late'], default: 'absent' })
  status: string;

  @Column({ name: 'recognized_at', type: 'timestamp', nullable: true })
  recognized_at: Date;

  @Column({ name: 'captured_frame_url', type: 'text', nullable: true })
  captured_frame_url: string;

  @ManyToOne(() => Session, (session) => session.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @ManyToOne(() => Student, (student) => student.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
