import { HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../prisma/prisma.service';
import { NutritionAiQuotaService } from './nutrition-ai-quota.service';

function createService() {
  const prisma = {
    $queryRaw: vi.fn(),
    nutritionAiDailyUsage: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    prisma,
    service: new NutritionAiQuotaService(prisma as unknown as PrismaService),
  };
}

describe('NutritionAiQuotaService', () => {
  const now = new Date('2026-07-26T12:00:00.000Z');

  it('returns the two-message allowance when the member has not used AI today', async () => {
    const { prisma, service } = createService();
    prisma.nutritionAiDailyUsage.findUnique.mockResolvedValue(null);

    await expect(service.getUsage('user-1', now)).resolves.toEqual({
      limit: 2,
      remaining: 2,
      resetsAt: '2026-07-26T21:00:00.000Z',
      used: 0,
    });
  });

  it('atomically reserves a daily message and reports the remaining allowance', async () => {
    const { prisma, service } = createService();
    prisma.$queryRaw.mockResolvedValue([{ messageCount: 2 }]);

    await expect(service.reserve('user-1', now)).resolves.toMatchObject({
      limit: 2,
      remaining: 0,
      used: 2,
    });
  });

  it('rejects a third successful message on the same gym day', async () => {
    const { prisma, service } = createService();
    prisma.$queryRaw.mockResolvedValue([]);

    const error = await service.reserve('user-1', now).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('releases the reservation when the AI provider fails', async () => {
    const { prisma, service } = createService();
    prisma.nutritionAiDailyUsage.updateMany.mockResolvedValue({ count: 1 });

    await service.release('user-1', now);

    expect(prisma.nutritionAiDailyUsage.updateMany).toHaveBeenCalledWith({
      data: { messageCount: { decrement: 1 } },
      where: {
        messageCount: { gt: 0 },
        usageDate: new Date('2026-07-26T00:00:00.000Z'),
        userId: 'user-1',
      },
    });
  });
});
