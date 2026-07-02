import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MembershipsController],
  exports: [MembershipsService],
  providers: [MembershipsService],
})
export class MembershipsModule {}
