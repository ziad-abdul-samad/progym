import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MembershipAuditAction, UserRole } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  CreateMembershipPlanDto,
  CreateSubscriptionDto,
  MembershipMutationDto,
  UpdateMembershipPlanDto,
} from './dto/memberships.dto';
import { MembershipsService } from './memberships.service';

@Controller('memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get('plans')
  @Protected()
  async listPlans() {
    return { data: await this.memberships.listPlans() };
  }

  @Post('plans')
  @Protected(UserRole.ADMIN)
  async createPlan(@Body() dto: CreateMembershipPlanDto) {
    return { data: await this.memberships.createPlan(dto) };
  }

  @Patch('plans/:id')
  @Protected(UserRole.ADMIN)
  async updatePlan(@Param('id') id: string, @Body() dto: UpdateMembershipPlanDto) {
    return { data: await this.memberships.updatePlan(id, dto) };
  }

  @Get('subscriptions')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async listSubscriptions(@Query() query: PaginationDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.memberships.listSubscriptions(query, user) };
  }

  @Post('subscriptions')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.memberships.createSubscription(dto, admin) };
  }

  @Patch('subscriptions/:id/add-days')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async addDays(
    @Param('id') id: string,
    @Body() dto: MembershipMutationDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return {
      data: await this.memberships.mutateSubscription(
        id,
        MembershipAuditAction.ADD_DAYS,
        dto,
        admin,
      ),
    };
  }

  @Patch('subscriptions/:id/remove-days')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async removeDays(
    @Param('id') id: string,
    @Body() dto: MembershipMutationDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return {
      data: await this.memberships.mutateSubscription(
        id,
        MembershipAuditAction.REMOVE_DAYS,
        dto,
        admin,
      ),
    };
  }

  @Patch('subscriptions/:id/freeze')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async freeze(
    @Param('id') id: string,
    @Body() dto: MembershipMutationDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return {
      data: await this.memberships.mutateSubscription(id, MembershipAuditAction.FREEZE, dto, admin),
    };
  }

  @Patch('subscriptions/:id/resume')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async resume(
    @Param('id') id: string,
    @Body() dto: MembershipMutationDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return {
      data: await this.memberships.mutateSubscription(id, MembershipAuditAction.RESUME, dto, admin),
    };
  }

  @Patch('subscriptions/:id/renew')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async renew(
    @Param('id') id: string,
    @Body() dto: MembershipMutationDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return {
      data: await this.memberships.mutateSubscription(id, MembershipAuditAction.RENEW, dto, admin),
    };
  }

  @Patch('subscriptions/:id/expire')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async expire(
    @Param('id') id: string,
    @Body() dto: MembershipMutationDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return {
      data: await this.memberships.mutateSubscription(id, MembershipAuditAction.EXPIRE, dto, admin),
    };
  }

  @Get('audit')
  @Protected(UserRole.ADMIN)
  async audit(@Query() query: PaginationDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.memberships.listAuditLogs(query, user) };
  }
}
