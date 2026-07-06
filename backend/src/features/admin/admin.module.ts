import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../../storage/storage.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  controllers: [AdminController],
  imports: [MembershipsModule, NotificationsModule, StorageModule],
  providers: [AdminService],
})
export class AdminModule {}
