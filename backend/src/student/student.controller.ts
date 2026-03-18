import { 
  Controller, Get, Post, Body, 
  UseInterceptors, UploadedFile, BadRequestException, 
  Delete, Logger, Param, NotFoundException, UseGuards, 

} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { MinioService } from '../minio/minio.service';
import { AiService } from '../ai/ai.service'; 
import { AppAuthGuard } from '~/auth/guards/app-auth.guard';


export interface AiRecognizeResponse {
  status: string;
  student_id?: string | null;
  distance?: number | null;
  message: string;
  full_name?: string | null;
}

@Controller('student')
@UseGuards(AppAuthGuard)
export class StudentController {
  private readonly logger = new Logger(StudentController.name);

  constructor(
    private readonly studentService: StudentService,
    private readonly minioService: MinioService,
    private readonly aiService: AiService
  ) {}

  @Post('register-face')
  async enrollStudent(@Body() dto: CreateStudentDto) {
    if (!dto.images || dto.images.length === 0) {
      throw new BadRequestException('Bắt buộc phải có ít nhất 1 ảnh!');
    }

    let avatarUrl = '';
    const existingStudent = await this.studentService.findByStudentId(dto.student_id);

    for (let i = 0; i < dto.images.length; i++) {
      const base64Data = dto.images[i].replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const originalName = `${dto.student_id}_face_${i}.jpg`;

      await this.aiService.registerFace(dto.student_id, buffer, originalName);

      if (i === 0) {
        if (existingStudent && existingStudent.image_url) {
          const oldFileName = existingStudent.image_url.split('/').pop();
          if (oldFileName) await this.minioService.deleteFile(oldFileName);
        }

        const minioFileName = `${dto.student_id}_${Date.now()}.jpg`;
        avatarUrl = await this.minioService.uploadFile(buffer, minioFileName, 'image/jpeg');
      }
    }

    await this.studentService.upsertStudent(dto, avatarUrl);

    return {
      message: 'Hệ thống đã nạp Vector vào FAISS, lưu ảnh lên MinIO và cập nhật MongoDB thành công!'
    };
  }

  @Post('recognize')
  @UseInterceptors(FileInterceptor('file'))
  async recognizeStudent(
    @UploadedFile() file: Express.Multer.File
  ): Promise<AiRecognizeResponse> {
    if (!file) throw new BadRequestException('Bắt buộc phải cung cấp ảnh để nhận diện!');

    const aiResult = await this.aiService.recognizeFace(file.buffer, file.originalname);

    if (aiResult.status === 'success' && aiResult.student_id) {
       const studentInfo = await this.studentService.findByStudentId(aiResult.student_id);
       
       return {
         status: aiResult.status,
         student_id: aiResult.student_id,
         distance: aiResult.distance,
         message: `Nhận diện thành công MSSV: ${aiResult.student_id}`,
         full_name: studentInfo?.full_name || 'Không rõ tên',
       };
    }

    return {
      status: aiResult.status,
      student_id: null,
      distance: null,
      message: aiResult.message || 'Không nhận diện được khuôn mặt',
      full_name: null,
    }; 
  }

  @Get('course/:courseId')
  async getStudentsByCourse(@Param('courseId') courseId: string) {
    return this.studentService.getStudentsByCourse(courseId);
  }

  @Get()
  findAll() {
    return this.studentService.findAll();
  }

  @Delete(':id')
  async removeStudent(@Param('id') studentId: string) {
    const student = await this.studentService.findByStudentId(studentId);
    if (!student) {
      throw new NotFoundException(`Không tìm thấy sinh viên có MSSV: ${studentId}`);
    }

    await this.aiService.deleteFace(studentId);

    if (student.image_url) {
      const fileName = student.image_url.split('/').pop(); 
      if (fileName) {
        await this.minioService.deleteFile(fileName);
      }
    }

    const isDeleted = await this.studentService.deleteStudent(studentId);
    if (!isDeleted) {
      throw new BadRequestException('Đã xảy ra lỗi không xác định khi xóa dữ liệu khỏi MongoDB.');
    }

    return {
      message: `Đã xóa thành công sinh viên ${studentId} trên toàn bộ hệ thống!`
    };
  }
}