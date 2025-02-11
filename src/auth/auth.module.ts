import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersRepository } from '../users/users.repository';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [JwtModule.register({}), DatabaseModule],
  providers: [AuthService, UsersRepository],
  controllers: [AuthController],
})
export class AuthModule {}
