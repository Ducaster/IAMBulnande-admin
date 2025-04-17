import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // ✅ 전역 설정
    DatabaseModule,
    AuthModule,
    EventsModule,
  ],
})
export class AppModule {}
