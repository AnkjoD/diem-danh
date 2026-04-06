import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ClassEntity } from '../../class/entities/class.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'teacher_id', nullable: true })
  teacher_id: string;

  @OneToMany(() => ClassEntity, (cls) => cls.course)
  classes: ClassEntity[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}