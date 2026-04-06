import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ClassEntity } from '../../class/entities/class.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', nullable: true })
  session_id: string;

  @ManyToOne(() => ClassEntity, (cls) => cls.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classData: ClassEntity;

  @Column({ name: 'late_threshold', type: 'timestamp', nullable: true })
  late_threshold: Date;

  @Column({ name: 'end_threshold', type: 'timestamp', nullable: true })
  end_threshold: Date;

  @OneToMany(() => Attendance, (attendance) => attendance.session)
  attendances: Attendance[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}