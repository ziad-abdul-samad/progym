import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { requireBranchId } from '../../common/utils/branch.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { ExpenseDto, FinanceRangeDto } from './finance.dto';

// Gym business dates are Damascus dates, independent of the browser/server timezone.
export function businessRange(from: string, to: string) {
  const date = (s: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new BadRequestException('Invalid date');
    const utc = new Date(s + 'T00:00:00Z');
    if (Number.isNaN(utc.getTime()) || utc.toISOString().slice(0, 10) !== s)
      throw new BadRequestException('Invalid date');
    return new Date(s + 'T00:00:00+03:00');
  };
  const start = date(from),
    end = new Date(date(to).getTime() + 86400000);
  if (end <= start || end.getTime() - start.getTime() > 366 * 86400000)
    throw new BadRequestException('اختر فترة صحيحة لا تتجاوز سنة');
  return { gte: start, lt: end };
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async addExpense(dto: ExpenseDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor);
    const spentAt = businessRange(dto.spentOn, dto.spentOn).gte;
    if (spentAt > new Date()) throw new BadRequestException('لا يمكن تسجيل مصروف بتاريخ مستقبلي');
    if (dto.title.trim().length < 2) throw new BadRequestException('اكتب اسم المصروف');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.requestKey}, 0))::text`;
      const existing = await tx.expense.findUnique({ where: { requestKey: dto.requestKey } });
      if (existing) {
        if (
          existing.branchId !== branchId ||
          existing.createdById !== actor.id ||
          existing.amountMinor !== dto.amountMinor ||
          existing.currency !== dto.currency ||
          existing.title !== dto.title.trim() ||
          existing.spentAt.getTime() !== spentAt.getTime()
        )
          throw new ConflictException('Request key already used');
        return existing;
      }
      const expense = await tx.expense.create({
        data: {
          branchId,
          requestKey: dto.requestKey,
          title: dto.title.trim(),
          notes: dto.notes?.trim(),
          amountMinor: dto.amountMinor,
          currency: dto.currency,
          spentAt,
          createdById: actor.id,
          createdByName: actor.fullName,
        },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          actorId: actor.id,
          branchId,
          entityId: expense.id,
          entityType: 'Expense',
          metadata: { expense },
        },
      });
      return expense;
    });
  }

  async voidExpense(id: string, reason: string, actor: AuthenticatedUser) {
    if (reason.trim().length < 3) throw new BadRequestException('سبب الإلغاء مطلوب');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Expense" WHERE id = ${id} FOR UPDATE`;
      const expense = await tx.expense.findUnique({ where: { id } });
      if (!expense || expense.branchId !== requireBranchId(actor))
        throw new NotFoundException('Expense not found');
      if (expense.voidedAt) return expense;
      const updated = await tx.expense.update({
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
          branchId: expense.branchId,
          entityId: id,
          entityType: 'Expense',
          metadata: { action: 'VOID', reason: reason.trim(), previousValue: expense },
        },
      });
      return updated;
    });
  }

  async report(query: FinanceRangeDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor),
      range = businessRange(query.from, query.to);
    const paidWhere: Prisma.PaymentWhereInput = {
      branchIdSnapshot: branchId,
      status: 'PAID',
      paidAt: range,
    };
    const expenseWhere: Prisma.ExpenseWhereInput = { branchId, spentAt: range };
    // One repeatable-read snapshot keeps totals and detail rows internally consistent.
    return this.prisma.$transaction(
      async (tx) => {
        const [
          branch,
          income,
          spending,
          plans,
          receivers,
          receipts,
          expenses,
          receiptCount,
          expenseCount,
        ] = await Promise.all([
          tx.branch.findUniqueOrThrow({
            where: { id: branchId },
            select: { code: true, nameAr: true },
          }),
          tx.payment.groupBy({
            by: ['currency'],
            where: paidWhere,
            _sum: { amountMinor: true },
            _count: true,
          }),
          tx.expense.groupBy({
            by: ['currency'],
            where: { ...expenseWhere, voidedAt: null },
            _sum: { amountMinor: true },
            _count: true,
          }),
          tx.$queryRaw<
            Array<{
              name: string;
              currency: string;
              durationDays: number | null;
              unitPriceMinor: number;
              count: number;
              players: number;
              totalMinor: number;
            }>
          >`
          SELECT COALESCE("planNameSnapshot", 'اشتراكات سابقة — الباقة غير محفوظة') AS name, currency,
            "durationDaysSnapshot" AS "durationDays", "amountMinor" AS "unitPriceMinor",
            COUNT(*)::int AS count, COUNT(DISTINCT "memberIdSnapshot")::int AS players,
            SUM("amountMinor")::float8 AS "totalMinor"
          FROM "Payment" WHERE "branchIdSnapshot" = ${branchId} AND status = 'PAID'
            AND "paidAt" >= ${range.gte} AND "paidAt" < ${range.lt}
          GROUP BY "planIdSnapshot", "planNameSnapshot", currency, "durationDaysSnapshot", "amountMinor"
          ORDER BY name, currency, "unitPriceMinor"`,
          tx.$queryRaw<
            Array<{ name: string; currency: string; count: number; totalMinor: number }>
          >`
          SELECT COALESCE("observerNameSnapshot", "receiverNameSnapshot", 'سجل سابق') AS name,
            currency, COUNT(*)::int AS count, SUM("amountMinor")::float8 AS "totalMinor"
          FROM "Payment" WHERE "branchIdSnapshot" = ${branchId} AND status = 'PAID'
            AND "paidAt" >= ${range.gte} AND "paidAt" < ${range.lt}
          GROUP BY "observerNameSnapshot", "receiverNameSnapshot", currency ORDER BY name`,
          tx.payment.findMany({
            where: paidWhere,
            orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
            skip: (query.page - 1) * 50,
            take: 50,
            select: {
              id: true,
              paidAt: true,
              amountMinor: true,
              currency: true,
              planNameSnapshot: true,
              durationDaysSnapshot: true,
              memberNameSnapshot: true,
              memberIdSnapshot: true,
              receiverNameSnapshot: true,
              observerNameSnapshot: true,
              subscription: {
                select: { member: { select: { user: { select: { fullName: true } } } } },
              },
            },
          }),
          tx.expense.findMany({
            where: expenseWhere,
            orderBy: [{ spentAt: 'desc' }, { id: 'desc' }],
            skip: (query.page - 1) * 50,
            take: 50,
          }),
          tx.payment.count({ where: paidWhere }),
          tx.expense.count({ where: expenseWhere }),
        ]);
        const currencies = [
          ...new Set([...income.map((x) => x.currency), ...spending.map((x) => x.currency)].sort()),
        ];
        return {
          branch,
          range: { from: query.from, to: query.to },
          generatedAt: new Date().toISOString(),
          totals: currencies.map((currency) => {
            const incomeMinor = income.find((x) => x.currency === currency)?._sum.amountMinor ?? 0;
            const expenseMinor =
              spending.find((x) => x.currency === currency)?._sum.amountMinor ?? 0;
            return { currency, incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor };
          }),
          plans,
          receivers,
          receipts,
          expenses,
          receiptCount,
          expenseCount,
          page: query.page,
          pageSize: 50,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 },
    );
  }
}
