import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

export interface IMinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
}

export interface IBucketPolicyStatement {
  Effect: string;
  Principal: { AWS: string[] };
  Action: string[];
  Resource: string[];
}

export interface IBucketPolicy {
  Version: string;
  Statement: IBucketPolicyStatement[];
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly minioClient: Minio.Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(MinioService.name);

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'attendance-logs';
    
    const {
      MINIO_ENDPOINT,
      MINIO_PORT,
      MINIO_ACCESS_KEY,
      MINIO_SECRET_KEY,
    } = process.env;

    if (!MINIO_ENDPOINT || !MINIO_PORT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
      throw new Error('Missing required MinIO environment variables');
    }

    const config: IMinioConfig = {
      endPoint: MINIO_ENDPOINT,
      port: parseInt(MINIO_PORT, 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    };

    this.minioClient = new Minio.Client(config);
  }

  async onModuleInit(): Promise<void> {
    await this.initBucket();
  }

  private async initBucket(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Created bucket: ${this.bucketName}`);
      } else {
        this.logger.log(`Bucket '${this.bucketName}' is ready to use.`);
      }

      const policy: IBucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };

      await this.minioClient.setBucketPolicy(
        this.bucketName,
        JSON.stringify(policy),
      );
      this.logger.log(`Set public read policy for: ${this.bucketName}`);
    } catch (error) {
      this.logger.error(`Error initializing bucket ${this.bucketName}`, error);
    }
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, mimetype: string = 'image/jpeg'): Promise<string> {
    try {
      await this.minioClient.putObject(
        this.bucketName, 
        fileName, 
        fileBuffer, 
        fileBuffer.length,
        { 'Content-Type': mimetype }
      );
      
      // --- FIX LỖI HIỂN THỊ ẢNH TRÊN TRÌNH DUYỆT ---
      // Trình duyệt không hiểu host 'minio' trong network của Docker. 
      // Ta chuyển 'minio' sang '127.0.0.1' (localhost) để frontend load được ảnh.
      // Xóa block này nếu sau này dùng Domain/Nginx Proxy thật.
      let endPoint = process.env.MINIO_ENDPOINT || '127.0.0.1';
      if (endPoint === 'minio') {
        endPoint = '127.0.0.1';
      }
      const port = process.env.MINIO_PORT || '9000';
      const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
      
      return `${protocol}://${endPoint}:${port}/${this.bucketName}/${fileName}`;
    } catch (error) {
      this.logger.error(`Upload error for ${fileName}`, error);
      throw error;
    }
  }
  public async deleteFile(fileName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, fileName);
      
    } catch (error) {
      this.logger.error(`Failed to delete object ${fileName} from MinIO`, error);
    }
  }
}