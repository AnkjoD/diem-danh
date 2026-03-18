export interface ISession {
  _id: string;
  course_code: string;
  date: Date;
  room: string;
  is_open: boolean;
}

export class SessionEntity implements ISession {
  _id: string;
  course_code: string;
  date: Date;
  room: string;
  is_open: boolean;

  constructor(partial: Partial<SessionEntity>) {
    Object.assign(this, partial);
  }
}