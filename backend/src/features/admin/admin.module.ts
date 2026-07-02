import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../../storage/storage.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  imports: [NotificationsModule, StorageModule],
  providers: [AdminService],
})
export class AdminModule {}
