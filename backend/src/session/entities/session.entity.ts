import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ClassEntity } from '../../class/entities/class.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sessions')
export class Session {
  @ApiProperty({ example: 'fdf30720-6cb0-45f8-a015-c20712d3163a' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '1714200316653', description: 'Internal session ID or timestamp' })
  @Column({ name: 'session_id', nullable: true })
  session_id: string;

  @ManyToOne(() => ClassEntity, (cls) => cls.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classData: ClassEntity;

  @ApiProperty({ example: '2026-03-22T08:00:00Z', required: false })
  @Column({ name: 'late_threshold', type: 'timestamp', nullable: true })
  late_threshold: Date;

  @ApiProperty({ example: '2026-03-22T10:00:00Z', required: false })
  @Column({ name: 'end_threshold', type: 'timestamp', nullable: true })
  end_threshold: Date;

  @ApiProperty({ type: () => Attendance, isArray: true })
  @OneToMany(() => Attendance, (attendance) => attendance.session)
  attendances: Attendance[];

  @ApiProperty({ example: '2026-03-22T07:25:16Z' })
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}