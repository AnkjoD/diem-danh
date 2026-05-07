import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { ValidationPipe, Logger } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('Attendance System API')
    .setDescription('The API documentation for the Classroom Attendance System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const logger = new Logger('Bootstrap');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.use(cookieParser())
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-xsrf-token'],
  });

  const port = process.env.PORT ?? 4000;
  const server = await app.listen(port, '0.0.0.0');
  
  // Tăng timeout cho server (5 phút) để xử lý AI lâu
  const httpServer = app.getHttpServer();
  httpServer.setTimeout(300000); 

  logger.log(`Server đang chạy tại: http://localhost:${port}`);
}
bootstrap();
