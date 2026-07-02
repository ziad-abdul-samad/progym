import { Module } from '@nestjs/common';

import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController],
  imports: [MembershipsModule, NotificationsModule],
  providers: [AttendanceService],
})
export class AttendanceModule {}
