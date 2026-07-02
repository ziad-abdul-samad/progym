import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CoachesService } from './coaches.service';
import {
  AddCoachClientDto,
  CoachProfileChangeDto,
  CreateCoachRequestDto,
  CreateNutritionPlanDto,
  CreateWorkoutPlanDto,
  ManageCoachSubscriptionDto,
} from './dto/coaches.dto';

@Controller('coaches')
@Protected(UserRole.COACH)
export class CoachesController {
  constructor(private readonly coaches: CoachesService) {}

  @Get('dashboard')
  async dashboard(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.coaches.dashboard(user) };
  }

  @Get('account')
  async account(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.coaches.account(user) };
  }

  @Post('account/change-requests')
  async requestAccountChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CoachProfileChangeDto,
  ) {
    return { data: await this.coaches.requestAccountChange(user, dto) };
  }

  @Delete('account/change-requests/:id')
  async cancelAccountChange(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { data: await this.coaches.cancelAccountChange(user, id) };
  }

  @Get('clients')
  async clients(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return { data: await this.coaches.assignedClients(user, query) };
  }

  @Get('available-members')
  async availableMembers(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return { data: await this.coaches.availableMembers(user, query) };
  }

  @Get('subscription-archive')
  async subscriptionArchive(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return { data: await this.coaches.subscriptionArchive(user, query) };
  }

  @Post('clients')
  async addClient(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddCoachClientDto) {
    return { data: await this.coaches.addClient(user, dto.memberId) };
  }

  @Post('clients/:memberId/start')
  async startClientSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: ManageCoachSubscriptionDto,
  ) {
    return { data: await this.coaches.startClientSubscription(user, memberId, dto) };
  }

  @Post('clients/:memberId/renew')
  async renewClientSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: ManageCoachSubscriptionDto,
  ) {
    return { data: await this.coaches.renewClientSubscription(user, memberId, dto) };
  }

  @Patch('clients/:memberId/deactivate')
  async deactivateClient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
  ) {
    return { data: await this.coaches.deactivateClient(user, memberId) };
  }

  @Patch('clients/:memberId/resume')
  async resumeClient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
  ) {
    return { data: await this.coaches.resumeClientSubscription(user, memberId) };
  }

  @Patch('clients/:memberId/end')
  async endClientRelationship(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
  ) {
    return { data: await this.coaches.endClientRelationship(user, memberId) };
  }

  @Get('clients/:memberId')
  async client(@CurrentUser() user: AuthenticatedUser, @Param('memberId') memberId: string) {
    return { data: await this.coaches.clientDetail(user, memberId) };
  }

  @Post('workout-plans')
  async workout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkoutPlanDto) {
    return { data: await this.coaches.createWorkoutPlan(user, dto) };
  }

  @Patch('workout-plans/:id')
  async updateWorkout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateWorkoutPlanDto,
  ) {
    return { data: await this.coaches.updateWorkoutPlan(user, id, dto) };
  }

  @Delete('workout-plans/:id')
  async deleteWorkout(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { data: await this.coaches.deleteWorkoutPlan(user, id) };
  }

  @Post('nutrition-plans')
  async nutrition(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNutritionPlanDto) {
    return { data: await this.coaches.createNutritionPlan(user, dto) };
  }

  @Patch('nutrition-plans/:id')
  async updateNutrition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateNutritionPlanDto,
  ) {
    return { data: await this.coaches.updateNutritionPlan(user, id, dto) };
  }

  @Delete('nutrition-plans/:id')
  async deleteNutrition(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { data: await this.coaches.deleteNutritionPlan(user, id) };
  }

  @Post('requests')
  async request(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCoachRequestDto) {
    return { data: await this.coaches.createRequest(user, dto) };
  }

  @Patch('requests/:id/complete')
  async completeRequest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { data: await this.coaches.completeRequest(user, id) };
  }
}
