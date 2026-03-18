import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
  ) {}

  async createSession(data: CreateSessionDto) {
    const newSession = await this.sessionModel.create({
      course_id: data.course_id,
      date: new Date(data.date),
      session_type: data.session_type,
    });
    return newSession;
  }

  async getSessionsByCourseId(courseId: string) {
    return this.sessionModel.find({ course_id: courseId }).sort({ date: -1 }).lean();
  }
}