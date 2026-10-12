import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { requireBranchId } from '../../common/utils/branch.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { OwnerWithdrawalDto } from './finance.dto';
import { businessRange } from './finance.service';

@Injectable()
export class OwnerWithdrawalsService {
  constructor(private readonly prisma: PrismaService) {}

  async add(dto: OwnerWithdrawalDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor);
    const withdrawnAt = businessRange(dto.withdrawnOn, dto.withdrawnOn).gte;
    const usdMinor = dto.usdMinor ?? 0,
      sypNewMinor = dto.sypNewMinor ?? 0,
      barUsdMinor = dto.barUsdMinor ?? 0,
      barSypNewMinor = dto.barSypNewMinor ?? 0;
    if (
      ![usdMinor, sypNewMinor].every((n) => Number.isInteger(n) && n >= 0 && n <= 2000000000) ||
      !(usdMinor || sypNewMinor)
    )
      throw new BadRequestException('أدخل مبلغ السحب بعملة واحدة على الأقل');
    if (
      ![barUsdMinor, barSypNewMinor].every((n) => Number.isInteger(n) && n >= 0) ||
      barUsdMinor > usdMinor ||
      barSypNewMinor > sypNewMinor
    )
      throw new BadRequestException('مبلغ البار جزء من إجمالي التسليم، ولا يمكن أن يتجاوزه');
    if (withdrawnAt > new Date()) throw new BadRequestException('لا يمكن تسجيل سحب بتاريخ مستقبلي');
    const ownerNameSnapshot = dto.ownerName.trim(),
      notes = dto.notes?.trim() || null;
    if (ownerNameSnapshot.length < 2) throw new BadRequestException('اكتب اسم مستلم الأموال');
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.requestKey}, 0))::text`;
        const existing = await tx.ownerWithdrawal.findUnique({
          where: { requestKey: dto.requestKey },
        });
        if (existing) {
          if (
            existing.branchId !== branchId ||
            existing.createdById !== actor.id ||
            existing.usdMinor !== usdMinor ||
            existing.sypNewMinor !== sypNewMinor ||
            existing.barUsdMinor !== barUsdMinor ||
            existing.barSypNewMinor !== barSypNewMinor ||
            existing.ownerNameSnapshot !== ownerNameSnapshot ||
            existing.notes !== notes ||
            existing.withdrawnAt.getTime() !== withdrawnAt.getTime()
          )
            throw new ConflictException('مفتاح العملية مستخدم لسحب آخر');
          return existing;
        }
        // Serializes payouts and sale corrections across all receptionists in this branch.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'bar-settlement:' + branchId},0))::text`;
        const withdrawal = await tx.ownerWithdrawal.create({
          data: {
            branchId,
            requestKey: dto.requestKey,
            ownerNameSnapshot,
            usdMinor,
            sypNewMinor,
            barUsdMinor,
            barSypNewMinor,
            withdrawnAt,
            notes,
            createdById: actor.id,
            createdByName: actor.fullName,
          },
        });
        for (const [currency, requested] of [
          ['USD', barUsdMinor],
          ['SYP_NEW', barSypNewMinor],
        ] as const) {
          if (!requested) continue;
          const end = businessRange(dto.withdrawnOn, dto.withdrawnOn).lt;
          const rows = await tx.$queryRaw<Array<{ id: string; remaining: number }>>`
          SELECT s.id,(s."amountMinor"-COALESCE((SELECT SUM(a."amountMinor")
            FROM "BarSettlement" a JOIN "OwnerWithdrawal" w ON w.id=a."withdrawalId"
            WHERE a."saleId"=s.id AND w."voidedAt" IS NULL),0))::float8 AS remaining
          FROM "BarSale" s WHERE s."branchId"=${branchId} AND s.currency=${currency}
            AND s."voidedAt" IS NULL AND s."soldAt"<${end}
          ORDER BY s."soldAt",s."createdAt",s.id FOR UPDATE OF s`;
          let remaining = requested;
          for (const row of rows) {
            if (remaining <= 0) break;
            const amountMinor = Math.min(remaining, row.remaining);
            if (amountMinor <= 0) continue;
            await tx.barSettlement.create({
              data: { branchId, saleId: row.id, withdrawalId: withdrawal.id, amountMinor },
            });
            remaining -= amountMinor;
          }
          if (remaining)
            throw new BadRequestException(
              'مبلغ البار يتجاوز المبيعات المسجلة التي لم يستلمها المالك حتى تاريخ التسليم؛ راجع التاريخ والمبلغ',
            );
        }
        await tx.auditLog.create({
          data: {
            action: AuditAction.CREATE,
            actorId: actor.id,
            branchId,
            entityId: withdrawal.id,
            entityType: 'OwnerWithdrawal',
            metadata: { withdrawal },
          },
        });
        return withdrawal;
      },
      { timeout: 20000 },
    );
  }

  async void(id: string, reason: string, actor: AuthenticatedUser) {
    if (reason.trim().length < 3) throw new BadRequestException('سبب إلغاء القيد مطلوب');
    const branchId = requireBranchId(actor);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'bar-settlement:' + branchId},0))::text`;
      await tx.$queryRaw`SELECT id FROM "OwnerWithdrawal" WHERE id=${id} AND "branchId"=${branchId} FOR UPDATE`;
      const previous = await tx.ownerWithdrawal.findUnique({ where: { id } });
      if (!previous || previous.branchId !== branchId)
        throw new NotFoundException('Withdrawal not found');
      if (previous.voidedAt) return previous;
      const updated = await tx.ownerWithdrawal.update({
        where: { id },
        data: {
          voidedAt: new Date(),
          voidedById: actor.id,
          voidReason: reason.trim(),
        },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          actorId: actor.id,
          branchId,
          entityId: id,
          entityType: 'OwnerWithdrawal',
          metadata: { action: 'VOID', reason: reason.trim(), previousValue: previous },
        },
      });
      return updated;
    });
  }
}
