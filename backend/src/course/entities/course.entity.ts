import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ClassEntity } from '../../class/entities/class.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('courses')
export class Course {
  @ApiProperty({ example: 'b25b9651-d731-4773-a9b7-4205cc3aa886' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Phát triển Web' })
  @Column()
  name: string;

  @ApiProperty({ example: '03904e0a-fff9-4cb5-894f-d05188eabe93' })
  @Column({ name: 'teacher_id', nullable: true })
  teacher_id: string;

  @OneToMany(() => ClassEntity, (cls) => cls.course)
  classes: ClassEntity[];

  @ApiProperty({ example: '2026-03-22T07:25:16Z' })
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}