import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { MembershipsService } from '../memberships/memberships.service';
import { CreateExerciseCategoryDto, CreateExerciseDto } from './dto/exercises.dto';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(
    private readonly exercises: ExercisesService,
    private readonly memberships: MembershipsService,
  ) {}

  @Get('categories')
  @Protected()
  async categories(@CurrentUser() user: AuthenticatedUser) {
    await this.assertExerciseAccess(user);
    return { data: await this.exercises.listCategories() };
  }

  @Post('categories/defaults')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async defaults(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.exercises.seedDefaultCategories(user) };
  }

  @Post('categories')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async createCategory(
    @Body() dto: CreateExerciseCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.exercises.createCategory(dto, user) };
  }

  @Get()
  @Protected()
  async list(@CurrentUser() user: AuthenticatedUser, @Query('categoryId') categoryId?: string) {
    await this.assertExerciseAccess(user);
    return { data: await this.exercises.list(categoryId) };
  }

  @Get('admin')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async adminList(@Query() query: PaginationDto) {
    return { data: await this.exercises.adminList(query) };
  }

  @Post()
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async create(@Body() dto: CreateExerciseDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.exercises.create(dto, user) };
  }

  @Patch(':id')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateExerciseDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.exercises.update(id, dto, user) };
  }

  @Delete(':id')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.exercises.delete(id, user) };
  }

  private async assertExerciseAccess(user: AuthenticatedUser) {
    if (user.role !== UserRole.MEMBER || !user.memberProfileId) return;
    const membership = await this.memberships.getMembershipSummary(user.memberProfileId);
    if (membership.isExpired || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Your subscription has expired. Please contact Pro Gym administration.',
      );
    }
  }
}
