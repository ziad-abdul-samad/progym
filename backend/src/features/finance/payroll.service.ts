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
import { businessRange } from './finance.service';
import type {
  SalaryPaymentDto,
  SalaryRecipientDto,
  SalaryRecipientStatusDto,
  SalaryRecipientsQueryDto,
  UpdateSalaryRecipientDto,
} from './finance.dto';

function monthKey(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new BadRequestException('اختر شهر الراتب');
  return value;
}
function recipientValues(dto: SalaryRecipientDto) {
  const name = dto.name.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (name.length < 2) throw new BadRequestException('اكتب اسم العامل كاملاً');
  return {
    name,
    nameKey: name.toLocaleLowerCase('ar'),
    jobTitle: dto.jobTitle?.trim() || null,
    salaryMinor: dto.salaryMinor,
    currency: dto.currency,
  };
}
function sameRevision(actual: Date, expected: string) {
  if (actual.getTime() !== new Date(expected).getTime())
    throw new ConflictException('تغيرت بيانات العامل. حدّث القائمة ثم راجعها قبل الحفظ.');
}
function uniqueNameError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw new ConflictException(
      'هذا الاسم محفوظ في الفرع، وقد يكون ضمن الموقوفين. استخدم الاسم الكامل للتمييز.',
    );
  throw error;
}

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async recipients(query: SalaryRecipientsQueryDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor),
      month = monthKey(query.month),
      pageSize = 20;
    const where: Prisma.SalaryRecipientWhereInput = {
      branchId,
      archivedAt: query.status === 'ARCHIVED' ? { not: null } : null,
      ...(query.q?.trim()
        ? {
            OR: [
              { name: { contains: query.q.trim(), mode: 'insensitive' } },
              { jobTitle: { contains: query.q.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const [people, total] = await Promise.all([
          tx.salaryRecipient.findMany({
            where,
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            skip: (query.page - 1) * pageSize,
            take: pageSize,
          }),
          tx.salaryRecipient.count({ where }),
        ]);
        const payments = await tx.expense.groupBy({
          by: ['salaryRecipientId', 'currency'],
          where: {
            branchId,
            kind: 'SALARY',
            salaryMonth: month,
            voidedAt: null,
            salaryRecipientId: { in: people.map((p) => p.id) },
          },
          _sum: { amountMinor: true },
          _count: { _all: true },
        });
        const byRecipient = new Map<string, typeof payments>();
        for (const payment of payments) {
          const key = payment.salaryRecipientId!;
          const rows = byRecipient.get(key) ?? [];
          rows.push(payment);
          byRecipient.set(key, rows);
        }
        return {
          items: people.map((person) => ({
            ...person,
            paid: (byRecipient.get(person.id) ?? []).map((p) => ({
              currency: p.currency,
              amountMinor: p._sum.amountMinor ?? 0,
              count: p._count._all,
            })),
            paymentCount: (byRecipient.get(person.id) ?? []).reduce((n, p) => n + p._count._all, 0),
          })),
          meta: {
            page: query.page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async createRecipient(dto: SalaryRecipientDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const person = await tx.salaryRecipient.create({
          data: {
            ...recipientValues(dto),
            branchId,
            createdById: actor.id,
            createdByName: actor.fullName,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            branchId,
            action: AuditAction.CREATE,
            entityType: 'SalaryRecipient',
            entityId: person.id,
            metadata: { person },
          },
        });
        return person;
      });
    } catch (error) {
      uniqueNameError(error);
    }
  }

  async updateRecipient(id: string, dto: UpdateSalaryRecipientDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "SalaryRecipient" WHERE id=${id} AND "branchId"=${branchId} FOR UPDATE`;
        const previous = await tx.salaryRecipient.findFirst({ where: { id, branchId } });
        if (!previous) throw new NotFoundException('العامل غير موجود في هذا الفرع');
        sameRevision(previous.updatedAt, dto.expectedUpdatedAt);
        const person = await tx.salaryRecipient.update({
          where: { id },
          data: {
            ...recipientValues(dto),
            updatedAt: new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1)),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            branchId,
            action: AuditAction.UPDATE,
            entityType: 'SalaryRecipient',
            entityId: id,
            metadata: { previousValue: previous, newValue: person },
          },
        });
        return person;
      });
    } catch (error) {
      uniqueNameError(error);
    }
  }

  async status(id: string, dto: SalaryRecipientStatusDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "SalaryRecipient" WHERE id=${id} AND "branchId"=${branchId} FOR UPDATE`;
      const previous = await tx.salaryRecipient.findFirst({ where: { id, branchId } });
      if (!previous) throw new NotFoundException('العامل غير موجود في هذا الفرع');
      if (Boolean(previous.archivedAt) === dto.archived) return previous;
      sameRevision(previous.updatedAt, dto.expectedUpdatedAt);
      const person = await tx.salaryRecipient.update({
        where: { id },
        data: {
          archivedAt: dto.archived ? new Date() : null,
          updatedAt: new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1)),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          branchId,
          action: AuditAction.UPDATE,
          entityType: 'SalaryRecipient',
          entityId: id,
          metadata: { action: dto.archived ? 'ARCHIVE' : 'RESTORE', previousValue: previous },
        },
      });
      return person;
    });
  }

  async pay(dto: SalaryPaymentDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor),
      month = monthKey(dto.month);
    const spentAt = businessRange(dto.spentOn, dto.spentOn).gte;
    if (spentAt > new Date())
      throw new BadRequestException('لا يمكن تسجيل راتب بتاريخ دفع مستقبلي');
    return this.prisma.$transaction(async (tx) => {
      // Stable request key handles network retries; recipient row serializes concurrent
      // payouts, edits and archives. Counts are checked after acquiring that lock.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.requestKey},0))::text`;
      const existing = await tx.expense.findUnique({ where: { requestKey: dto.requestKey } });
      if (existing) {
        if (
          existing.kind !== 'SALARY' ||
          existing.branchId !== branchId ||
          existing.createdById !== actor.id ||
          existing.salaryRecipientId !== dto.recipientId ||
          existing.salaryMonth !== month ||
          existing.amountMinor !== dto.amountMinor ||
          existing.currency !== dto.currency ||
          existing.spentAt.getTime() !== spentAt.getTime() ||
          (existing.notes ?? '') !== (dto.notes?.trim() ?? '')
        )
          throw new ConflictException('مفتاح الدفع مستخدم لقيد مختلف');
        // Never resurrect a voided payment during a retry.
        return existing;
      }
      await tx.$queryRaw`SELECT id FROM "SalaryRecipient" WHERE id=${dto.recipientId} AND "branchId"=${branchId} FOR UPDATE`;
      const person = await tx.salaryRecipient.findFirst({
        where: { id: dto.recipientId, branchId },
      });
      if (!person) throw new NotFoundException('العامل غير موجود في هذا الفرع');
      if (person.archivedAt)
        throw new BadRequestException('العامل موقوف؛ أعد تفعيله قبل تسجيل دفعة جديدة');
      sameRevision(person.updatedAt, dto.expectedUpdatedAt);
      const count = await tx.expense.count({
        where: {
          branchId,
          kind: 'SALARY',
          salaryRecipientId: person.id,
          salaryMonth: month,
          voidedAt: null,
        },
      });
      if (count !== dto.previousPaymentCount)
        throw new ConflictException(
          'تغيرت دفعات هذا الشهر. حدّث القائمة وراجع المدفوع قبل التأكيد.',
        );
      if (count > 0 && !dto.confirmAdditional)
        throw new ConflictException('توجد دفعة عن هذا الشهر. أكّد أن المبلغ دفعة إضافية مقصودة.');
      const expense = await tx.expense.create({
        data: {
          branchId,
          kind: 'SALARY',
          requestKey: dto.requestKey,
          salaryRecipientId: person.id,
          salaryNameSnapshot: person.name,
          salaryJobSnapshot: person.jobTitle,
          salaryMonth: month,
          title: `راتب ${person.name} - ${month}`,
          notes: dto.notes?.trim() || null,
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
          entityType: 'Expense',
          entityId: expense.id,
          metadata: { action: 'SALARY_PAYMENT', expense },
        },
      });
      return expense;
    });
  }
}
