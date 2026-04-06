import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TeacherModule } from '../teacher/teacher.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TeacherModule,
    PassportModule,
    JwtModule.registerAsync({
                          useFactory: () => ({
                            secret: process.env.JWT_SECRET || 'default_secret',
                            signOptions: { expiresIn: '1d' },
                            global: true,
                          }),
                        }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], 
  exports: [AuthService],
})
export class AuthModule {}