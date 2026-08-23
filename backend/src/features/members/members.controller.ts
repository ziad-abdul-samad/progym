import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  CalculatorDto,
  CreateWorkoutLogDto,
  FoodAnalysisDto,
  NutritionChatHistoryQueryDto,
  UpdateMemberProfileDto,
} from './dto/members.dto';
import { MembersService } from './members.service';

@Controller('members')
@Protected(UserRole.MEMBER)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get('dashboard')
  async dashboard(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.members.dashboard(user) };
  }

  @Patch('profile')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMemberProfileDto,
    @UploadedFile() photo: Express.Multer.File | undefined,
  ) {
    return { data: await this.members.updateProfile(user, dto, photo) };
  }

  @Get('profile/history')
  async profileHistory(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.members.profileHistory(user) };
  }

  @Get('profile/change-requests')
  async profileChangeRequests(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.members.profileChangeRequests(user) };
  }

  @Get('workout-plans')
  async workouts(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.members.workoutPlans(user) };
  }

  @Get('nutrition-plans')
  async nutrition(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.members.nutritionPlans(user) };
  }

  @Get('membership-history')
  async membershipHistory(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.members.membershipHistory(user) };
  }

  @Get('workout-logs')
  async workoutLogs(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.members.workoutLogs(user) };
  }

  @Post('workout-logs')
  async createWorkoutLog(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkoutLogDto) {
    return { data: await this.members.createWorkoutLog(user, dto) };
  }

  @Get('requests')
  async requests(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.members.requests(user) };
  }

  @Patch('requests/:id/complete')
  async completeRequest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { data: await this.members.completeRequest(user, id) };
  }

  @Post('calculators')
  async calculators(@CurrentUser() user: AuthenticatedUser, @Body() dto: CalculatorDto) {
    return { data: await this.members.calculators(user, dto) };
  }

  @Post('nutrition-chat')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async analyzeFood(@CurrentUser() user: AuthenticatedUser, @Body() dto: FoodAnalysisDto) {
    return { data: await this.members.analyzeFood(user, dto) };
  }

  @Get('nutrition-chat/usage')
  async nutritionAiUsage(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.members.nutritionAiUsage(user) };
  }

  @Get('nutrition-chat/history')
  async nutritionAiHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NutritionChatHistoryQueryDto,
  ) {
    return { data: await this.members.nutritionAiHistory(user, query) };
  }
}
