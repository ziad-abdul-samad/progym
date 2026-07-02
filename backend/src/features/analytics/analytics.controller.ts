import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Protected } from '../../common/decorators/protected.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@Protected(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  async overview() {
    return { data: await this.analytics.overview() };
  }
}
