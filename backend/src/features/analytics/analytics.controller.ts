import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Protected } from '../../common/decorators/protected.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AnalyticsService } from './analytics.service';
import { ReportQueryDto, UpdateReportSettingsDto } from './dto/reports.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async overview(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.analytics.overview(user) };
  }

  @Get('report-settings')
  @Protected(UserRole.ADMIN)
  async reportSettings(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.analytics.reportSettings(user) };
  }

  @Patch('report-settings')
  @Protected(UserRole.ADMIN)
  async updateReportSettings(
    @Body() dto: UpdateReportSettingsDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return {
      data: await this.analytics.updateReportSettings(dto.monthlySubscriptionPriceMinor, admin),
    };
  }

  @Get('report')
  @Protected(UserRole.ADMIN)
  async report(@Query() query: ReportQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.analytics.report(query, user) };
  }
}
