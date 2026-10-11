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
import { businessRange } from './finance-date';
import { barReport } from './bar.service';
import { reportDistribution } from './report-calculations';
export { businessRange } from './finance-date';

// Gym business dates are Damascus dates, independent of the browser/server timezone.

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
          existing.kind !== 'GENERAL' ||
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
    const withdrawalWhere: Prisma.OwnerWithdrawalWhereInput = { branchId, withdrawnAt: range };
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
          expenseKinds,
          salaries,
          withdrawals,
          withdrawalCount,
          withdrawalAmounts,
          bar,
          catalog,
          unpaidStaff,
          clubExpenseGroups,
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
              planId: string | null;
              audience: string;
              inferredAudienceCount: number;
            }>
          >`
          SELECT COALESCE(p."planNameSnapshot", 'اشتراكات سابقة — الباقة غير محفوظة') AS name,p.currency,
            p."planIdSnapshot" AS "planId",COALESCE(p."planAudienceSnapshot"::text,m.audience::text,'UNKNOWN') AS audience,
            p."durationDaysSnapshot" AS "durationDays",p."amountMinor" AS "unitPriceMinor",
            COUNT(*)::int AS count,COUNT(DISTINCT p."memberIdSnapshot")::int AS players,
            COUNT(*) FILTER (WHERE p."planAudienceSnapshot" IS NULL AND m.id IS NOT NULL)::int AS "inferredAudienceCount",
            SUM(p."amountMinor")::float8 AS "totalMinor"
          FROM "Payment" p LEFT JOIN "MembershipPlan" m ON m.id=p."planIdSnapshot"
          WHERE p."branchIdSnapshot"=${branchId} AND p.status='PAID' AND p."paidAt">=${range.gte} AND p."paidAt"<${range.lt}
          GROUP BY p."planIdSnapshot",p."planNameSnapshot",p.currency,p."durationDaysSnapshot",p."amountMinor",COALESCE(p."planAudienceSnapshot"::text,m.audience::text,'UNKNOWN')
          ORDER BY audience,name,p.currency,"unitPriceMinor"`,
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
          tx.expense.groupBy({
            by: ['kind', 'currency'],
            where: { ...expenseWhere, voidedAt: null },
            _sum: { amountMinor: true },
            _count: { _all: true },
          }),
          tx.$queryRaw<
            Array<{
              name: string;
              jobTitle: string | null;
              month: string;
              currency: string;
              count: number;
              totalMinor: number;
            }>
          >`
            SELECT "salaryNameSnapshot" AS name,"salaryJobSnapshot" AS "jobTitle","salaryMonth" AS month,currency,
              COUNT(*)::int AS count,SUM("amountMinor")::float8 AS "totalMinor"
            FROM "Expense" WHERE "branchId"=${branchId} AND kind='SALARY' AND "voidedAt" IS NULL
              AND "spentAt">=${range.gte} AND "spentAt"<${range.lt}
            GROUP BY "salaryRecipientId","salaryNameSnapshot","salaryJobSnapshot","salaryMonth",currency
            ORDER BY month,name,currency`,
          tx.ownerWithdrawal.findMany({
            where: withdrawalWhere,
            orderBy: [{ withdrawnAt: 'desc' }, { id: 'desc' }],
            skip: (query.page - 1) * 50,
            take: 50,
          }),
          tx.ownerWithdrawal.count({ where: withdrawalWhere }),
          tx.ownerWithdrawal.aggregate({
            where: { ...withdrawalWhere, voidedAt: null },
            _sum: { usdMinor: true, sypNewMinor: true },
          }),
          barReport(tx, branchId, range, query.page),
          tx.membershipPlan.findMany({
            where: { branchId, isActive: true, deletedAt: null },
            select: {
              id: true,
              nameAr: true,
              audience: true,
              currency: true,
              durationDays: true,
              priceMinor: true,
            },
          }),
          tx.$queryRaw<
            Array<{
              name: string;
              jobTitle: string | null;
              currency: string;
              count: number;
              totalMinor: number;
            }>
          >`SELECT s.name,s."jobTitle",s.currency,0::int count,0::float8 AS "totalMinor" FROM "SalaryRecipient" s WHERE s."branchId"=${branchId} AND s."archivedAt" IS NULL AND NOT EXISTS (SELECT 1 FROM "Expense" e WHERE e."salaryRecipientId"=s.id AND e."branchId"=${branchId} AND e.kind='SALARY' AND e."voidedAt" IS NULL AND e."spentAt">=${range.gte} AND e."spentAt"<${range.lt}) ORDER BY s.name`,
          tx.$queryRaw<
            Array<{ title: string; currency: string; count: number; totalMinor: number }>
          >`SELECT title,currency,COUNT(*)::int count,SUM("amountMinor")::float8 AS "totalMinor" FROM "Expense" WHERE "branchId"=${branchId} AND kind='GENERAL' AND "voidedAt" IS NULL AND "spentAt">=${range.gte} AND "spentAt"<${range.lt} GROUP BY title,currency ORDER BY title,currency`,
        ]);
        const currencies = [
          ...new Set(
            [
              ...income.map((x) => x.currency),
              ...spending.map((x) => x.currency),
              ...bar.totals.map((t) => t.currency),
              ...catalog.map((t) => t.currency),
              ...(withdrawalAmounts._sum.usdMinor ? ['USD'] : []),
              ...(withdrawalAmounts._sum.sypNewMinor ? ['SYP_NEW'] : []),
            ].sort(),
          ),
        ];
        for (const plan of catalog)
          if (
            !plans.some(
              (p) =>
                p.planId === plan.id &&
                p.unitPriceMinor === plan.priceMinor &&
                p.currency === plan.currency &&
                p.audience === plan.audience,
            )
          )
            plans.push({
              planId: plan.id,
              name: plan.nameAr,
              audience: plan.audience,
              currency: plan.currency,
              durationDays: plan.durationDays,
              unitPriceMinor: plan.priceMinor,
              count: 0,
              players: 0,
              totalMinor: 0,
              inferredAudienceCount: 0,
            });
        plans.sort(
          (a, b) =>
            a.audience.localeCompare(b.audience) ||
            a.name.localeCompare(b.name, 'ar') ||
            a.unitPriceMinor - b.unitPriceMinor,
        );
        return {
          branch,
          range: { from: query.from, to: query.to },
          generatedAt: new Date().toISOString(),
          totals: currencies.map((currency) => {
            const incomeMinor = income.find((x) => x.currency === currency)?._sum.amountMinor ?? 0;
            const expenseMinor =
              spending.find((x) => x.currency === currency)?._sum.amountMinor ?? 0;
            const salaryMinor =
              expenseKinds.find((x) => x.currency === currency && x.kind === 'SALARY')?._sum
                .amountMinor ?? 0;
            const ownerWithdrawalMinor =
              currency === 'USD'
                ? (withdrawalAmounts._sum.usdMinor ?? 0)
                : currency === 'SYP_NEW'
                  ? (withdrawalAmounts._sum.sypNewMinor ?? 0)
                  : 0;
            return {
              currency,
              incomeMinor,
              expenseMinor,
              salaryMinor,
              otherExpenseMinor: expenseMinor - salaryMinor,
              netMinor: incomeMinor - expenseMinor,
              ownerWithdrawalMinor,
              cashMovementMinor: incomeMinor - expenseMinor - ownerWithdrawalMinor,
              barIncomeMinor: bar.totals.find((t) => t.currency === currency)?.incomeMinor ?? 0,
              barExpenseMinor: bar.totals.find((t) => t.currency === currency)?.expenseMinor ?? 0,
              ...reportDistribution(
                branch.code,
                incomeMinor - expenseMinor,
                bar.totals.find((t) => t.currency === currency)?.netMinor ?? 0,
                ownerWithdrawalMinor,
              ),
            };
          }),
          plans,
          receivers,
          salaries,
          salaryRoster: [...salaries, ...unpaidStaff],
          clubExpenseGroups,
          bar,
          receipts,
          expenses,
          receiptCount,
          expenseCount,
          withdrawals,
          withdrawalCount,
          page: query.page,
          pageSize: 50,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 },
    );
  }
}
