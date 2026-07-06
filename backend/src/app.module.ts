import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AdminModule } from './features/admin/admin.module';
import { AnalyticsModule } from './features/analytics/analytics.module';
import { AttendanceModule } from './features/attendance/attendance.module';
import { AuthModule } from './features/auth/auth.module';
import { CoachesModule } from './features/coaches/coaches.module';
import { ExercisesModule } from './features/exercises/exercises.module';
import { MembersModule } from './features/members/members.module';
import { MembershipsModule } from './features/memberships/memberships.module';
import { NotificationsModule } from './features/notifications/notifications.module';
import { ProgressModule } from './features/progress/progress.module';
import { UsersModule } from './features/users/users.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),
    CommonModule,
    ThrottlerModule.forRoot([
      {
        limit: 240,
        ttl: 60_000,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    MembersModule,
    CoachesModule,
    ExercisesModule,
    MembershipsModule,
    AttendanceModule,
    ProgressModule,
    NotificationsModule,
    AnalyticsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
