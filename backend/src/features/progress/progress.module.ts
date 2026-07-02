import { Module } from '@nestjs/common';

import { StorageModule } from '../../storage/storage.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  controllers: [ProgressController],
  imports: [MembershipsModule, NotificationsModule, StorageModule],
  exports: [ProgressService],
  providers: [ProgressService],
})
export class ProgressModule {}
