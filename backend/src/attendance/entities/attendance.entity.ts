import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Session } from '../../session/entities/session.entity';
import { Student } from '../../student/entities/student.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('attendances')
export class Attendance {
  @ApiProperty({ example: '7d0c7c7c-5560-4814-a63b-29a832f90ebd' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: ['present', 'absent', 'late'], default: 'absent' })
  @Column({ type: 'enum', enum: ['present', 'absent', 'late'], default: 'absent' })
  status: string;

  @ApiProperty({ example: '2026-03-22T08:15:00Z', required: false })
  @Column({ name: 'recognized_at', type: 'timestamp', nullable: true })
  recognized_at: Date;

  @ApiProperty({ example: 'http://localhost:9000/frames/session_id/frame.jpg', required: false })
  @Column({ name: 'captured_frame_url', type: 'text', nullable: true })
  captured_frame_url: string;

  @ApiProperty({ example: 'http://localhost:9000/raw-frames/frame_raw.jpg', required: false })
  @Column({ name: 'raw_frame_url', type: 'text', nullable: true })
  raw_frame_url: string;

  @ApiProperty({ example: { bbox: [10, 20, 100, 200] }, required: false })
  @Column({ name: 'training_metadata', type: 'jsonb', nullable: true })
  training_metadata: any;

  @ManyToOne(() => Session, (session) => session.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @ApiProperty({ type: () => Student })
  @ManyToOne(() => Student, (student) => student.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ApiProperty({ example: '2026-03-22T07:25:16Z' })
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
