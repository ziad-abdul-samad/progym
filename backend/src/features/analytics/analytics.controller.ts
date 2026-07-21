import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Protected } from '../../common/decorators/protected.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AnalyticsService } from './analytics.service';
import { ReportQueryDto, UpdateReportSettingsDto } from './dto/reports.dto';

@Controller('analytics')
@Protected(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  async overview() {
    return { data: await this.analytics.overview() };
  }

  @Get('report-settings')
  async reportSettings() {
    return { data: await this.analytics.reportSettings() };
  }

  @Patch('report-settings')
  async updateReportSettings(
    @Body() dto: UpdateReportSettingsDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return {
      data: await this.analytics.updateReportSettings(dto.monthlySubscriptionPriceMinor, admin),
    };
  }

  @Get('report')
  async report(@Query() query: ReportQueryDto) {
    return { data: await this.analytics.report(query) };
  }
}
