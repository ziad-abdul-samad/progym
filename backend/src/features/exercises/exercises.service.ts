import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

import type { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { requireBranchId } from '../../common/utils/branch.util';
import { paginated, paginationArgs } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateExerciseCategoryDto, CreateExerciseDto } from './dto/exercises.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultCategories(user: AuthenticatedUser) {
    const categories = [
      ['chest', 'صدر', 'Chest'],
      ['back', 'ظهر', 'Back'],
      ['shoulders', 'أكتاف', 'Shoulders'],
      ['arms', 'ذراعين', 'Arms'],
      ['core', 'عضلات الوسط', 'Core'],
      ['legs', 'أرجل', 'Legs'],
      ['cardio', 'كارديو', 'Cardio'],
    ] as const;

    for (const [slug, nameAr, nameEn] of categories) {
      await this.prisma.exerciseCategory.upsert({
        create: { nameAr, nameEn, slug },
        update: { nameAr, nameEn },
        where: { slug },
      });
    }

    await this.audit(user, AuditAction.UPDATE, 'ExerciseCategory', 'defaults', {
      action: 'SEED_DEFAULTS',
    });
    return this.listCategories();
  }

  async listCategories() {
    return this.prisma.exerciseCategory.findMany({
      include: { _count: { select: { exercises: true } } },
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    });
  }

  async createCategory(dto: CreateExerciseCategoryDto, user: AuthenticatedUser) {
    const category = await this.prisma.exerciseCategory.create({ data: dto });
    await this.audit(user, AuditAction.CREATE, 'ExerciseCategory', category.id, {
      action: 'CREATE',
    });
    return category;
  }

  async list(categoryId?: string) {
    return this.prisma.exercise.findMany({
      include: { category: true },
      orderBy: { nameAr: 'asc' },
      where: {
        categoryId,
        isActive: true,
      },
    });
  }

  async adminList(query: PaginationDto) {
    const where: Prisma.ExerciseWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.trainingDay ? { trainingDay: query.trainingDay } : {}),
      ...(query.q
        ? {
            OR: [
              { nameAr: { contains: query.q, mode: 'insensitive' as const } },
              { nameEn: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.status === 'ACTIVE'
        ? { isActive: true }
        : query.status === 'INACTIVE'
          ? { isActive: false }
          : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.exercise.findMany({
        include: { category: true },
        orderBy: { updatedAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.exercise.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  async create(dto: CreateExerciseDto, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.create({ data: dto });
    await this.audit(user, AuditAction.CREATE, 'Exercise', exercise.id, { action: 'CREATE' });
    return exercise;
  }

  async update(id: string, dto: Partial<CreateExerciseDto>, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.update({ data: dto, where: { id } });
    await this.audit(user, AuditAction.UPDATE, 'Exercise', id, { action: 'UPDATE' });
    return exercise;
  }

  async delete(id: string, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.delete({ where: { id } });
    await this.audit(user, AuditAction.DELETE, 'Exercise', id, { action: 'DELETE' });
    return exercise;
  }

  private async audit(
    user: AuthenticatedUser,
    action: AuditAction,
    entityType: string,
    entityId: string,
    metadata: Prisma.InputJsonObject,
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        actorId: user.id,
        branchId: requireBranchId(user),
        entityId,
        entityType,
        metadata,
      },
    });
  }
}
