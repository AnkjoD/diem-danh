import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import FormData = require('form-data');
import { AiResponse } from './interfaces/ai-response';
import { RegisterResponse } from './interfaces/register-response';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiUrl = process.env.AI_SERVICE_URL;

  constructor() {
    if (!this.aiUrl) {
      throw new Error('AI_SERVICE_URL is not defined in environment variables');
    }
  }

  public async deleteFace(studentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.aiUrl}/delete/${studentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        this.logger.warn(`AI Server error ${studentId}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Connection error ${studentId}`, error);
      return false; 
    }
  }

  async recognizeFace(fileBuffer: Buffer, originalName: string): Promise<AiResponse> {
    try {
      const form = new FormData();
      form.append('file', fileBuffer, { filename: originalName });

      const { data } = await axios.post<AiResponse>(`${this.aiUrl}/recognize`, form, {
        headers: form.getHeaders(),
      });

      return data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        this.logger.error(`Recognize error: ${errorDetail}`, error.stack);
      } else if (error instanceof Error) {
        this.logger.error(`Recognize error: ${error.message}`, error.stack);
      }
      throw new InternalServerErrorException('AI Service error');
    }
  }

  async registerFace(studentId: string, fileBuffer: Buffer, originalName: string): Promise<RegisterResponse> {
    try {
      const form = new FormData();
      form.append('file', fileBuffer, { filename: originalName });
      form.append('student_id', studentId);

      const { data } = await axios.post<RegisterResponse>(`${this.aiUrl}/register`, form, {
        headers: form.getHeaders(),
      });

      return data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        this.logger.error(`Register error: ${errorDetail}`, error.stack);
      } else if (error instanceof Error) {
        this.logger.error(`Register error: ${error.message}`, error.stack);
      }
      throw new InternalServerErrorException('AI Service register error');
    }
  }
}