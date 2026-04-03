import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly minioClient: Minio.Client;
  private readonly logger = new Logger(MinioService.name);

  public readonly buckets = {
    register: 'attendance-register',
    frames: 'attendance-frames',
    deleted: 'attendance-deleted',
  };

  constructor() {
    const {
      MINIO_ENDPOINT,
      MINIO_PORT,
      MINIO_ACCESS_KEY,
      MINIO_SECRET_KEY,
    } = process.env;

    const config = {
      endPoint: MINIO_ENDPOINT || '127.0.0.1',
      port: parseInt(MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    };

    this.minioClient = new Minio.Client(config);
  }

  async onModuleInit(): Promise<void> {
    await this.initBuckets();
  }

  private async initBuckets(): Promise<void> {
    const bucketNames = Object.values(this.buckets);
    
    for (const b of bucketNames) {
      try {
        const exists = await this.minioClient.bucketExists(b);
        if (!exists) {
          await this.minioClient.makeBucket(b, 'us-east-1');
          this.logger.log(`Created bucket: ${b}`);
        }

        const policy = {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${b}/*`],
          }],
        };
        await this.minioClient.setBucketPolicy(b, JSON.stringify(policy));
      } catch (error) {
        this.logger.error(`Error initializing bucket ${b}: ${error.message}`);
      }
    }
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, mimetype: string = 'image/jpeg', bucketName: string): Promise<string> {
    if (!bucketName) {
      throw new Error('bucketName is required for uploadFile');
    }
    try {
      await this.minioClient.putObject(bucketName, fileName, fileBuffer, fileBuffer.length, { 'Content-Type': mimetype });
      
      let endPoint = process.env.MINIO_ENDPOINT || '127.0.0.1';
      if (endPoint === 'minio') endPoint = '127.0.0.1';
      const port = process.env.MINIO_PORT || '9000';
      const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
      
      return `${protocol}://${endPoint}:${port}/${bucketName}/${fileName}`;
    } catch (error) {
      this.logger.error(`Upload error for ${fileName} in bucket ${bucketName}: ${error.message}`);
      throw error;
    }
  }

  async moveFile(sourceKey: string, destinationKey: string, sourceBucket: string, destBucket: string): Promise<void> {
    if (!sourceBucket || !destBucket) {
      throw new Error('sourceBucket and destBucket are required for moveFile');
    }
    try {
      await this.minioClient.copyObject(destBucket, destinationKey, `/${sourceBucket}/${sourceKey}`, new Minio.CopyConditions());
      await this.minioClient.removeObject(sourceBucket, sourceKey);
      this.logger.log(`Moved ${sourceBucket}/${sourceKey} to ${destBucket}/${destinationKey}`);
    } catch (error) {
      this.logger.error(`Move error: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(fileName: string, bucketName: string): Promise<void> {
    if (!bucketName) {
      throw new Error('bucketName is required for deleteFile');
    }
    try {
      await this.minioClient.removeObject(bucketName, fileName);
    } catch (error) {
      this.logger.error(`Delete error for ${fileName} in bucket ${bucketName}: ${error.message}`);
    }
  }
}