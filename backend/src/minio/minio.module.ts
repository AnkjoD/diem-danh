import { Module } from '@nestjs/common';
import { MinioService } from './minio.service';

@Module({
  imports: [],
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}