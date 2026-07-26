import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { addDays, gymDate, startOfGymDayInstant } from '../../common/utils/membership.util';
import { PrismaService } from '../../prisma/prisma.service';

export const NUTRITION_AI_DAILY_LIMIT = 2;

export type NutritionAiUsage = {
  limit: number;
  remaining: number;
  resetsAt: string;
  used: number;
};

@Injectable()
export class NutritionAiQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsage(userId: string, now = new Date()): Promise<NutritionAiUsage> {
    const usageDate = gymDate(now);
    const usage = await this.prisma.nutritionAiDailyUsage.findUnique({
      select: { messageCount: true },
      where: { userId_usageDate: { usageDate, userId } },
    });

    return this.toUsage(usage?.messageCount ?? 0, now);
  }

  async reserve(userId: string, now = new Date()): Promise<NutritionAiUsage> {
    const usageDate = gymDate(now);
    const rows = await this.prisma.$queryRaw<Array<{ messageCount: number }>>(Prisma.sql`
      INSERT INTO "NutritionAiDailyUsage" (
        "id",
        "userId",
        "usageDate",
        "messageCount",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${userId},
        ${usageDate},
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId", "usageDate")
      DO UPDATE SET
        "messageCount" = "NutritionAiDailyUsage"."messageCount" + 1,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "NutritionAiDailyUsage"."messageCount" < ${NUTRITION_AI_DAILY_LIMIT}
      RETURNING "messageCount"
    `);

    const messageCount = rows[0]?.messageCount;
    if (!messageCount) {
      throw new HttpException(
        'لقد استخدمت رسالتي الذكاء الاصطناعي المتاحتين اليوم. يمكنك المحاولة مجدداً غداً. / You have used both AI messages available today. Please try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return this.toUsage(messageCount, now);
  }

  async release(userId: string, now = new Date()): Promise<void> {
    await this.prisma.nutritionAiDailyUsage.updateMany({
      data: { messageCount: { decrement: 1 } },
      where: {
        messageCount: { gt: 0 },
        usageDate: gymDate(now),
        userId,
      },
    });
  }

  private toUsage(messageCount: number, now: Date): NutritionAiUsage {
    const used = Math.min(NUTRITION_AI_DAILY_LIMIT, Math.max(0, messageCount));
    return {
      limit: NUTRITION_AI_DAILY_LIMIT,
      remaining: NUTRITION_AI_DAILY_LIMIT - used,
      resetsAt: addDays(startOfGymDayInstant(now), 1).toISOString(),
      used,
    };
  }
}
