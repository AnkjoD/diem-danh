import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SessionService } from './session/session.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const sessionService = app.get(SessionService);
  
  // classId: 6e326544-b444-4744-96b9-9168ec9b604e
  // teacherId: we need to find it from the class
  const dataSource = app.get('DataSource');
  const cls = await dataSource.query(`SELECT teacher_id FROM classes WHERE id = '6e326544-b444-4744-96b9-9168ec9b604e'`);
  const teacherId = cls[0].teacher_id;
  
  console.log('Teacher ID:', teacherId);
  
  const todaySession = await sessionService.findTodaySession(teacherId, '6e326544-b444-4744-96b9-9168ec9b604e');
  console.log('Today session ID:', todaySession?.id);
  console.log('Session ID:', todaySession?.id);
  console.log('Attendances count:', todaySession?.attendances?.length);
  
  if (todaySession?.attendances) {
    const presents = todaySession.attendances.filter(a => a.status === 'present');
    console.log('Presents count:', presents.length);
    console.log('Sample present student ID:', presents[0]?.student?.id);
  } else {
    console.log('NO ATTENDANCES RETURNED!');
  }
  
  await app.close();
}
bootstrap();
