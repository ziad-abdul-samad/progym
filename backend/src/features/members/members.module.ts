import { Module } from '@nestjs/common';

import { StorageModule } from '../../storage/storage.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { NutritionAiQuotaService } from './nutrition-ai-quota.service';
import { NutritionAiService } from './nutrition-ai.service';

@Module({
  controllers: [MembersController],
  imports: [MembershipsModule, NotificationsModule, StorageModule],
  providers: [MembersService, NutritionAiQuotaService, NutritionAiService],
})
export class MembersModule {}
