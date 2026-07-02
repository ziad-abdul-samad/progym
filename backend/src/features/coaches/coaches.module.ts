import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { CoachesController } from './coaches.controller';
import { CoachesService } from './coaches.service';

@Module({
  controllers: [CoachesController],
  imports: [NotificationsModule],
  exports: [CoachesService],
  providers: [CoachesService],
})
export class CoachesModule {}
