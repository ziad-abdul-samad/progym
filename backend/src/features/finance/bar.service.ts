import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireBranchId } from '../../common/utils/branch.util';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { businessRange } from './finance-date';
import type {
  BarCashDto,
  BarProductDto,
  BarProductsQueryDto,
  BarSaleDto,
  BarSaleBatchDto,
  UpdateBarProductDto,
} from './bar.dto';

function cashDate(date: string) {
  const value = businessRange(date, date).gte;
  if (value > new Date()) throw new BadRequestException('لا يمكن تسجيل أموال بتاريخ مستقبلي');
  return value;
}
function values(dto: BarProductDto) {
  const name = dto.name.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  const prices = dto.prices.map((p) => ({
    label: p.label.normalize('NFKC').trim(),
    unitPriceMinor: p.unitPriceMinor,
  }));
  if (
    name.length < 2 ||
    prices.some((p) => p.label.length < 2) ||
    new Set(prices.map((p) => p.label)).size !== prices.length
  )
    throw new BadRequestException('اكتب اسم المنتج وعناوين أسعار مختلفة');
  return {
    name,
    nameKey: name.toLocaleLowerCase('ar'),
    currency: dto.currency,
    prices,
    isActive: dto.isActive,
  };
}
@Injectable()
export class BarService {
  constructor(private readonly prisma: PrismaService) {}
  async products(query: BarProductsQueryDto, actor: AuthenticatedUser) {
    const where: Prisma.BarProductWhereInput = {
      branchId: requireBranchId(actor),
      isActive: query.status !== 'ARCHIVED',
      ...(query.q?.trim() ? { name: { contains: query.q.trim(), mode: 'insensitive' } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.barProduct.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * 20,
        take: 20,
      }),
      this.prisma.barProduct.count({ where }),
    ]);
    return {
      items,
      meta: {
        total,
        page: query.page,
        pageSize: 20,
        totalPages: Math.max(1, Math.ceil(total / 20)),
      },
    };
  }
  async product(dto: BarProductDto | UpdateBarProductDto, actor: AuthenticatedUser, id?: string) {
    const branchId = requireBranchId(actor),
      data = values(dto);
    try {
      return await this.prisma.$transaction(async (tx) => {
        let previous = null;
        if (id) {
          await tx.$queryRaw`SELECT id FROM "BarProduct" WHERE id=${id} AND "branchId"=${branchId} FOR UPDATE`;
          previous = await tx.barProduct.findUnique({ where: { id } });
          if (!previous || previous.branchId !== branchId)
            throw new NotFoundException('Product not found');
          if (
            previous.updatedAt.getTime() !==
            new Date((dto as UpdateBarProductDto).expectedUpdatedAt).getTime()
          )
            throw new ConflictException('تغيّر المنتج؛ حدّث القائمة ثم راجع الأسعار');
        }
        const saved = id
          ? await tx.barProduct.update({
              where: { id },
              data: {
                ...data,
                updatedAt: new Date(Math.max(Date.now(), (previous?.updatedAt.getTime() ?? 0) + 1)),
              },
            })
          : await tx.barProduct.create({ data: { ...data, branchId } });
        await tx.auditLog.create({
          data: {
            action: id ? AuditAction.UPDATE : AuditAction.CREATE,
            actorId: actor.id,
            branchId,
            entityType: 'BarProduct',
            entityId: saved.id,
            metadata: { previous, saved },
          },
        });
        return saved;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw new ConflictException('هذا المنتج محفوظ في الفرع، راجع المنتجات الموقوفة أيضًا');
      throw e;
    }
  }
  async sale(dto: BarSaleDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor),
      soldAt = cashDate(dto.soldOn),
      amountMinor = dto.quantity * dto.unitPriceMinor;
    if (!Number.isSafeInteger(amountMinor) || amountMinor > 2000000000)
      throw new BadRequestException('المجموع أكبر من الحد المسموح');
    const notes = dto.notes?.trim() || null,
      priceLabelSnapshot = dto.priceLabel.trim();
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.requestKey},0))::text`;
      const old = await tx.barSale.findUnique({ where: { requestKey: dto.requestKey } });
      if (old) {
        if (
          old.branchId !== branchId ||
          old.createdById !== actor.id ||
          old.productId !== dto.productId ||
          old.quantity !== dto.quantity ||
          old.unitPriceMinor !== dto.unitPriceMinor ||
          old.notes !== notes ||
          old.priceLabelSnapshot !== priceLabelSnapshot ||
          old.soldAt.getTime() !== soldAt.getTime()
        )
          throw new ConflictException('مفتاح العملية مستخدم لبيع آخر');
        return old;
      }
      await tx.$queryRaw`SELECT id FROM "BarProduct" WHERE id=${dto.productId} AND "branchId"=${branchId} FOR UPDATE`;
      const product = await tx.barProduct.findUnique({ where: { id: dto.productId } });
      if (!product || product.branchId !== branchId || !product.isActive)
        throw new NotFoundException('المنتج غير متاح في هذا الفرع');
      if (product.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime())
        throw new ConflictException('تغيّرت أسعار المنتج؛ راجع السعر الحالي قبل تسجيل البيع');
      const sale = await tx.barSale.create({
        data: {
          branchId,
          productId: product.id,
          requestKey: dto.requestKey,
          productNameSnapshot: product.name,
          priceLabelSnapshot,
          quantity: dto.quantity,
          unitPriceMinor: dto.unitPriceMinor,
          amountMinor,
          currency: product.currency,
          soldAt,
          notes,
          createdById: actor.id,
          createdByName: actor.fullName,
        },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          actorId: actor.id,
          branchId,
          entityType: 'BarSale',
          entityId: sale.id,
          metadata: { sale },
        },
      });
      return sale;
    });
  }
  async cash(dto: BarCashDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor),
      spentAt = cashDate(dto.spentOn),
      notes = dto.notes?.trim() || null,
      title = dto.title.trim();
    if (title.length < 2 || (dto.kind === 'EXPENSE' && dto.amountMinor === 0))
      throw new BadRequestException('اكتب اسم المصروف ومبلغًا موجبًا');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.requestKey},0))::text`;
      const old = await tx.barCashEntry.findUnique({ where: { requestKey: dto.requestKey } });
      if (old) {
        if (
          old.branchId !== branchId ||
          old.createdById !== actor.id ||
          old.kind !== dto.kind ||
          old.amountMinor !== dto.amountMinor ||
          old.currency !== dto.currency ||
          old.notes !== notes ||
          old.title !== title ||
          old.spentAt.getTime() !== spentAt.getTime()
        )
          throw new ConflictException('مفتاح العملية مستخدم لقيد آخر');
        return old;
      }
      const entry = await tx.barCashEntry.create({
        data: {
          branchId,
          requestKey: dto.requestKey,
          kind: dto.kind,
          title,
          amountMinor: dto.amountMinor,
          currency: dto.currency,
          spentAt,
          notes,
          createdById: actor.id,
          createdByName: actor.fullName,
        },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          actorId: actor.id,
          branchId,
          entityType: 'BarCashEntry',
          entityId: entry.id,
          metadata: { entry },
        },
      });
      return entry;
    });
  }
  async batch(dto: BarSaleBatchDto, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor),
      soldAt = cashDate(dto.soldOn);
    if (!dto.lines.length || dto.lines.length > 50)
      throw new BadRequestException('أضف من سطر واحد إلى 50 سطرًا للدفعة');
    const payload = {
      soldOn: dto.soldOn,
      notes: dto.notes?.trim() || null,
      lines: dto.lines.map((line) => ({
        productId: line.productId,
        expectedUpdatedAt: line.expectedUpdatedAt,
        priceLabel: line.priceLabel.trim(),
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
      })),
    };
    if (
      payload.lines.some(
        (l) =>
          !Number.isInteger(l.quantity) ||
          l.quantity < 1 ||
          l.quantity > 10000 ||
          !Number.isInteger(l.unitPriceMinor) ||
          l.unitPriceMinor < 0 ||
          !Number.isSafeInteger(l.quantity * l.unitPriceMinor) ||
          l.quantity * l.unitPriceMinor > 2000000000,
      )
    )
      throw new BadRequestException('راجع الكمية والسعر ومجموع كل سطر');
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.requestKey},0))::text`;
        const old = await tx.barSaleBatch.findUnique({
          where: { requestKey: dto.requestKey },
          include: { sales: true },
        });
        if (old) {
          const oldPayload = old.payload as typeof payload;
          if (
            old.branchId !== branchId ||
            old.createdById !== actor.id ||
            oldPayload.soldOn !== payload.soldOn ||
            oldPayload.notes !== payload.notes ||
            oldPayload.lines.length !== payload.lines.length ||
            oldPayload.lines.some((l, i) => {
              const next = payload.lines[i];
              return (
                !next ||
                l.productId !== next.productId ||
                l.expectedUpdatedAt !== next.expectedUpdatedAt ||
                l.priceLabel !== next.priceLabel ||
                l.quantity !== next.quantity ||
                l.unitPriceMinor !== next.unitPriceMinor
              );
            })
          )
            throw new ConflictException('مفتاح العملية مستخدم لدفعة مختلفة');
          return old;
        }
        const products = new Map<string, Awaited<ReturnType<typeof tx.barProduct.findUnique>>>();
        for (const id of [...new Set(payload.lines.map((l) => l.productId))].sort()) {
          await tx.$queryRaw`SELECT id FROM "BarProduct" WHERE id=${id} AND "branchId"=${branchId} FOR UPDATE`;
          const product = await tx.barProduct.findUnique({ where: { id } });
          if (!product || product.branchId !== branchId || !product.isActive)
            throw new NotFoundException('أحد منتجات الدفعة غير متاح في هذا الفرع');
          products.set(id, product);
        }
        const batch = await tx.barSaleBatch.create({
          data: { branchId, requestKey: dto.requestKey, payload, createdById: actor.id },
        });
        for (const [index, line] of payload.lines.entries()) {
          const product = products.get(line.productId)!;
          if (
            !product ||
            product.updatedAt.getTime() !== new Date(line.expectedUpdatedAt).getTime()
          )
            throw new ConflictException('تغيّر أحد المنتجات؛ حدّث القائمة وراجع الدفعة');
          await tx.barSale.create({
            data: {
              branchId,
              productId: product.id,
              batchId: batch.id,
              requestKey: dto.requestKey + ':' + index,
              productNameSnapshot: product.name,
              priceLabelSnapshot: line.priceLabel,
              quantity: line.quantity,
              unitPriceMinor: line.unitPriceMinor,
              amountMinor: line.quantity * line.unitPriceMinor,
              currency: product.currency,
              soldAt,
              notes: payload.notes,
              createdById: actor.id,
              createdByName: actor.fullName,
            },
          });
        }
        await tx.auditLog.create({
          data: {
            action: AuditAction.CREATE,
            actorId: actor.id,
            branchId,
            entityType: 'BarSaleBatch',
            entityId: batch.id,
            metadata: { batch, payload },
          },
        });
        return tx.barSaleBatch.findUnique({ where: { id: batch.id }, include: { sales: true } });
      },
      { timeout: 20000 },
    );
  }
  async void(type: 'sale' | 'cash', id: string, reason: string, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor),
      table = type === 'sale' ? 'BarSale' : 'BarCashEntry';
    if (reason.trim().length < 3) throw new BadRequestException('سبب إلغاء القيد مطلوب');
    return this.prisma.$transaction(async (tx) => {
      if (type === 'sale')
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'bar-settlement:' + branchId},0))::text`;
      await tx.$queryRawUnsafe(
        `SELECT id FROM "${table}" WHERE id=$1 AND "branchId"=$2 FOR UPDATE`,
        id,
        branchId,
      );
      const old =
        type === 'sale'
          ? await tx.barSale.findUnique({ where: { id } })
          : await tx.barCashEntry.findUnique({ where: { id } });
      if (!old || old.branchId !== branchId) throw new NotFoundException('Entry not found');
      if (old.voidedAt) return old;
      if (
        type === 'sale' &&
        (await tx.barSettlement.count({ where: { saleId: id, withdrawal: { voidedAt: null } } }))
      )
        throw new ConflictException(
          'استلم المالك أموالًا من هذا القيد؛ يجب تصحيح أو إلغاء التسليم المرتبط أولًا',
        );
      const data = { voidedAt: new Date(), voidedById: actor.id, voidReason: reason.trim() };
      const saved =
        type === 'sale'
          ? await tx.barSale.update({ where: { id }, data })
          : await tx.barCashEntry.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          actorId: actor.id,
          branchId,
          entityType: table,
          entityId: id,
          metadata: { action: 'VOID', reason: reason.trim(), previous: old },
        },
      });
      return saved;
    });
  }
}

export async function barReport(
  tx: Prisma.TransactionClient,
  branchId: string,
  range: { gte: Date; lt: Date },
  page: number,
) {
  const salesWhere = { branchId, soldAt: range },
    cashWhere = { branchId, spentAt: range };
  const [
    salesTotals,
    expenseTotals,
    sales,
    cashEntries,
    saleCount,
    cashCount,
    daily,
    products,
    balances,
    closingBalances,
    expenseGroups,
    unpaid,
    handovers,
  ] = await Promise.all([
    tx.barSale.groupBy({
      by: ['currency'],
      where: { ...salesWhere, voidedAt: null },
      _sum: { amountMinor: true, quantity: true },
    }),
    tx.barCashEntry.groupBy({
      by: ['currency'],
      where: { ...cashWhere, kind: 'EXPENSE', voidedAt: null },
      _sum: { amountMinor: true },
    }),
    tx.barSale.findMany({
      where: salesWhere,
      orderBy: [{ soldAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * 50,
      take: 50,
    }),
    tx.barCashEntry.findMany({
      where: cashWhere,
      orderBy: [{ spentAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * 50,
      take: 50,
    }),
    tx.barSale.count({ where: salesWhere }),
    tx.barCashEntry.count({ where: cashWhere }),
    tx.$queryRaw<
      Array<{ day: string; currency: string; amountMinor: number; quantity: number }>
    >`SELECT to_char("soldAt"+interval '3 hours','YYYY-MM-DD') AS "day",currency,SUM("amountMinor")::float8 AS "amountMinor",SUM(quantity)::int quantity FROM "BarSale" WHERE "branchId"=${branchId} AND "voidedAt" IS NULL AND "soldAt">=${range.gte} AND "soldAt"<${range.lt} GROUP BY "day",currency ORDER BY "day",currency`,
    tx.$queryRaw<
      Array<{
        name: string;
        label: string;
        currency: string;
        unitPriceMinor: number;
        quantity: number;
        amountMinor: number;
      }>
    >`SELECT "productNameSnapshot" name,"priceLabelSnapshot" label,currency,"unitPriceMinor",SUM(quantity)::int quantity,SUM("amountMinor")::float8 AS "amountMinor" FROM "BarSale" WHERE "branchId"=${branchId} AND "voidedAt" IS NULL AND "soldAt">=${range.gte} AND "soldAt"<${range.lt} GROUP BY "productId","productNameSnapshot","priceLabelSnapshot",currency,"unitPriceMinor" ORDER BY name,currency,"unitPriceMinor"`,
    tx.$queryRaw<
      Array<{ currency: string; openingMinor: number; anchorAt: Date }>
    >`SELECT a.currency,a."spentAt" AS "anchorAt",(a."amountMinor"::bigint+COALESCE((SELECT SUM(s."amountMinor") FROM "BarSale" s WHERE s."branchId"=${branchId} AND s.currency=a.currency AND s."voidedAt" IS NULL AND s."soldAt">=a."spentAt" AND s."soldAt"<${range.gte}),0)-COALESCE((SELECT SUM(e."amountMinor") FROM "BarCashEntry" e WHERE e."branchId"=${branchId} AND e.currency=a.currency AND e.kind='EXPENSE' AND e."voidedAt" IS NULL AND e."spentAt">=a."spentAt" AND e."spentAt"<${range.gte}),0))::float8 AS "openingMinor" FROM (SELECT DISTINCT ON (currency) * FROM "BarCashEntry" WHERE "branchId"=${branchId} AND kind='OPENING' AND "voidedAt" IS NULL AND "spentAt"<=${range.gte} ORDER BY currency,"spentAt" DESC,"createdAt" DESC,id DESC) a`,
    tx.$queryRaw<
      Array<{ currency: string; openingMinor: number; anchorAt: Date }>
    >`SELECT a.currency,a."spentAt" AS "anchorAt",(a."amountMinor"::bigint+COALESCE((SELECT SUM(s."amountMinor") FROM "BarSale" s WHERE s."branchId"=${branchId} AND s.currency=a.currency AND s."voidedAt" IS NULL AND s."soldAt">=a."spentAt" AND s."soldAt"<${range.lt}),0)-COALESCE((SELECT SUM(e."amountMinor") FROM "BarCashEntry" e WHERE e."branchId"=${branchId} AND e.currency=a.currency AND e.kind='EXPENSE' AND e."voidedAt" IS NULL AND e."spentAt">=a."spentAt" AND e."spentAt"<${range.lt}),0))::float8 AS "openingMinor" FROM (SELECT DISTINCT ON (currency) * FROM "BarCashEntry" WHERE "branchId"=${branchId} AND kind='OPENING' AND "voidedAt" IS NULL AND "spentAt"<${range.lt} ORDER BY currency,"spentAt" DESC,"createdAt" DESC,id DESC) a`,
    tx.$queryRaw<
      Array<{ title: string; currency: string; count: number; totalMinor: number }>
    >`SELECT title,currency,COUNT(*)::int count,SUM("amountMinor")::float8 AS "totalMinor" FROM "BarCashEntry" WHERE "branchId"=${branchId} AND kind='EXPENSE' AND "voidedAt" IS NULL AND "spentAt">=${range.gte} AND "spentAt"<${range.lt} GROUP BY title,currency ORDER BY title,currency`,
    tx.$queryRaw<
      Array<{ currency: string; oldUnwithdrawnMinor: number; newUnwithdrawnMinor: number }>
    >`
      SELECT s.currency,
        COALESCE(SUM(s."amountMinor"-COALESCE(a.paid,0)) FILTER(WHERE s."soldAt"<${range.gte}),0)::float8 AS "oldUnwithdrawnMinor",
        COALESCE(SUM(s."amountMinor"-COALESCE(a.paid,0)) FILTER(WHERE s."soldAt">=${range.gte}),0)::float8 AS "newUnwithdrawnMinor"
      FROM "BarSale" s LEFT JOIN LATERAL (
        SELECT SUM(x."amountMinor") paid FROM "BarSettlement" x
          JOIN "OwnerWithdrawal" w ON w.id=x."withdrawalId"
        WHERE x."saleId"=s.id AND w."voidedAt" IS NULL AND w."withdrawnAt"<${range.lt}
      ) a ON true WHERE s."branchId"=${branchId} AND s."voidedAt" IS NULL AND s."soldAt"<${range.lt}
      GROUP BY s.currency`,
    tx.ownerWithdrawal.aggregate({
      where: { branchId, voidedAt: null, withdrawnAt: range },
      _sum: { barUsdMinor: true, barSypNewMinor: true },
    }),
  ]);
  const currencies = [
    ...new Set([
      'SYP_NEW',
      ...salesTotals.map((t) => t.currency),
      ...expenseTotals.map((t) => t.currency),
      ...balances.map((t) => t.currency),
      ...closingBalances.map((t) => t.currency),
      ...unpaid.map((t) => t.currency),
    ]),
  ];
  return {
    sales,
    cashEntries,
    saleCount,
    cashCount,
    daily,
    products,
    expenseGroups,
    totals: currencies.map((currency) => {
      const incomeMinor = salesTotals.find((t) => t.currency === currency)?._sum.amountMinor ?? 0,
        expenseMinor = expenseTotals.find((t) => t.currency === currency)?._sum.amountMinor ?? 0,
        balance = balances.find((b) => b.currency === currency),
        closingBalance = closingBalances.find((b) => b.currency === currency);
      const openingMinor = balance?.openingMinor ?? null,
        netMinor = incomeMinor - expenseMinor;
      return {
        currency,
        incomeMinor,
        expenseMinor,
        netMinor,
        oldUnwithdrawnMinor: unpaid.find((t) => t.currency === currency)?.oldUnwithdrawnMinor ?? 0,
        newUnwithdrawnMinor: unpaid.find((t) => t.currency === currency)?.newUnwithdrawnMinor ?? 0,
        unwithdrawnMinor:
          (unpaid.find((t) => t.currency === currency)?.oldUnwithdrawnMinor ?? 0) +
          (unpaid.find((t) => t.currency === currency)?.newUnwithdrawnMinor ?? 0),
        handedOverMinor:
          currency === 'USD'
            ? (handovers._sum.barUsdMinor ?? 0)
            : currency === 'SYP_NEW'
              ? (handovers._sum.barSypNewMinor ?? 0)
              : 0,
        openingMinor,
        openingAt: balance?.anchorAt ?? null,
        totalAvailableMinor: openingMinor === null ? null : openingMinor + incomeMinor,
        closingMinor: closingBalance?.openingMinor ?? null,
        closingAt: closingBalance?.anchorAt ?? null,
        balanceResetDuringPeriod: !!closingBalance && closingBalance.anchorAt > range.gte,
      };
    }),
  };
}
