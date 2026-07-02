import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PaginationDto } from '../../common/dto/pagination.dto';
import { paginated, paginationArgs } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateExerciseCategoryDto, CreateExerciseDto } from './dto/exercises.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultCategories() {
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

    return this.listCategories();
  }

  async listCategories() {
    return this.prisma.exerciseCategory.findMany({
      include: { _count: { select: { exercises: true } } },
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    });
  }

  async createCategory(dto: CreateExerciseCategoryDto) {
    return this.prisma.exerciseCategory.create({ data: dto });
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

  async create(dto: CreateExerciseDto) {
    return this.prisma.exercise.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateExerciseDto>) {
    return this.prisma.exercise.update({ data: dto, where: { id } });
  }

  async delete(id: string) {
    return this.prisma.exercise.delete({ where: { id } });
  }
}
