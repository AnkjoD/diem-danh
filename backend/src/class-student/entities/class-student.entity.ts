import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ClassEntity } from '../../class/entities/class.entity';
import { Student } from '../../student/entities/student.entity';

@Entity('class_students')
export class ClassStudent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ClassEntity, (cls) => cls.classStudents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classEntity: ClassEntity;

  @ManyToOne(() => Student, (student) => student.classStudents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}
