import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  MembershipAuditAction,
  type MembershipPlan,
  ObserverStatus,
  Prisma,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';

import type { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { assertSameBranch, requireBranchId } from '../../common/utils/branch.util';
import { addDays, diffDaysCeil, summarizeSubscription } from '../../common/utils/membership.util';
import { paginated, paginationArgs } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateMembershipPlanDto,
  CreateSubscriptionDto,
  MembershipMutationDto,
  UpdateMembershipPlanDto,
} from './dto/memberships.dto';

function subscriptionSnapshot(subscription: {
  branchId: string;
  status: SubscriptionStatus;
  startsAt: Date;
  endsAt: Date;
  frozenAt: Date | null;
  planId: string | null;
}) {
  return {
    branchId: subscription.branchId,
    endsAt: subscription.endsAt.toISOString(),
    frozenAt: subscription.frozenAt?.toISOString() ?? null,
    planId: subscription.planId,
    startsAt: subscription.startsAt.toISOString(),
    status: subscription.status,
  };
}

export function canSubscriptionEnterBranch(
  subscriptionBranchCode: string,
  subscriptionBranchId: string,
  attemptedBranchId: string,
) {
  return (
    subscriptionBranchCode.toLowerCase() === 'b1' || subscriptionBranchId === attemptedBranchId
  );
}

export function computeSubscriptionChargeMinor(monthlyPriceMinor: number, days: number) {
  return Math.max(0, Math.round((monthlyPriceMinor * days) / 30));
}

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans(admin: AuthenticatedUser) {
    return this.prisma.membershipPlan.findMany({
      where: { branchId: requireBranchId(admin) },
      orderBy: [{ sortOrder: 'asc' }, { durationDays: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createPlan(dto: CreateMembershipPlanDto, admin: AuthenticatedUser) {
    if (!dto.nameAr.trim() || !dto.nameEn.trim()) throw new BadRequestException('اسم الباقة مطلوب');
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.membershipPlan.create({
        data: {
          ...dto,
          nameAr: dto.nameAr.trim(),
          nameEn: dto.nameEn.trim(),
          branchId: requireBranchId(admin),
          currency: dto.currency ?? 'SYP_NEW',
        },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          actorId: admin.id,
          branchId: plan.branchId,
          entityId: plan.id,
          entityType: 'MembershipPlan',
          metadata: { newValue: plan },
        },
      });
      return plan;
    });
  }

  async updatePlan(id: string, dto: UpdateMembershipPlanDto, admin: AuthenticatedUser) {
    if (
      (dto.nameAr !== undefined && !dto.nameAr.trim()) ||
      (dto.nameEn !== undefined && !dto.nameEn.trim())
    )
      throw new BadRequestException('اسم الباقة مطلوب');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "MembershipPlan" WHERE id = ${id} FOR UPDATE`;
      const previous = await tx.membershipPlan.findUnique({ where: { id } });
      if (!previous || previous.branchId !== requireBranchId(admin))
        throw new NotFoundException('Plan not found in this branch');
      const plan = await tx.membershipPlan.update({ where: { id }, data: dto });
      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          actorId: admin.id,
          branchId: plan.branchId,
          entityId: plan.id,
          entityType: 'MembershipPlan',
          metadata: { previousValue: previous, newValue: plan },
        },
      });
      return plan;
    });
  }

  private async paidPlan(
    tx: Prisma.TransactionClient,
    dto: { planId?: string; planUpdatedAt?: string },
    branchId: string,
  ) {
    if (!dto.planId) throw new BadRequestException('اختر باقة الاشتراك قبل تأكيد استلام المبلغ');
    await tx.$queryRaw`SELECT id FROM "MembershipPlan" WHERE id = ${dto.planId} FOR SHARE`;
    const plan = await tx.membershipPlan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive || plan.branchId !== branchId)
      throw new BadRequestException('هذه الباقة غير متاحة لهذا الفرع');
    if (!dto.planUpdatedAt || plan.updatedAt.toISOString() !== dto.planUpdatedAt)
      throw new ConflictException('تغيرت بيانات الباقة. أعد اختيارها وتحقق من السعر قبل التأكيد');
    return plan;
  }

  async getCurrentSubscription(memberId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      orderBy: [{ status: 'asc' }, { endsAt: 'desc' }],
      where: {
        memberId,
        status: { in: ['ACTIVE', 'FROZEN', 'PENDING'] },
      },
    });

    if (subscription?.status === SubscriptionStatus.ACTIVE && subscription.endsAt <= new Date()) {
      return this.prisma.subscription.update({
        data: { status: SubscriptionStatus.EXPIRED },
        where: { id: subscription.id },
      });
    }

    return subscription;
  }

  async getMembershipSummary(memberId: string) {
    const subscription = await this.getCurrentSubscription(memberId);
    const summary = summarizeSubscription(subscription);

    return summary;
  }

  async getBranchEntryAccess(memberId: string, attemptedBranchId: string) {
    const now = new Date();
    const [attemptedBranch, current] = await Promise.all([
      this.prisma.branch.findUnique({
        select: { code: true, id: true, nameAr: true, nameEn: true },
        where: { id: attemptedBranchId },
      }),
      this.prisma.subscription.findFirst({
        include: {
          branch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
          plan: { select: { nameAr: true, nameEn: true } },
        },
        orderBy: { endsAt: 'desc' },
        where: { memberId, status: { in: ['ACTIVE', 'FROZEN', 'PENDING'] } },
      }),
    ]);

    if (!attemptedBranch) throw new NotFoundException('Branch not found');

    let subscription = current;
    if (subscription?.status === SubscriptionStatus.ACTIVE && subscription.endsAt <= now) {
      subscription = await this.prisma.subscription.update({
        data: { status: SubscriptionStatus.EXPIRED },
        include: {
          branch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
          plan: { select: { nameAr: true, nameEn: true } },
        },
        where: { id: subscription.id },
      });
    }

    const remainingDays = subscription
      ? Math.max(0, Math.ceil((subscription.endsAt.getTime() - now.getTime()) / 86_400_000))
      : 0;
    const active = subscription?.status === SubscriptionStatus.ACTIVE && remainingDays > 0;
    const allowed = Boolean(
      active &&
      subscription &&
      canSubscriptionEnterBranch(
        subscription.branch.code,
        subscription.branchId,
        attemptedBranchId,
      ),
    );

    return {
      allowed,
      attemptedBranch,
      denialCode: allowed
        ? null
        : !subscription
          ? 'NO_ACTIVE_SUBSCRIPTION'
          : !active
            ? 'SUBSCRIPTION_INACTIVE'
            : 'BRANCH_NOT_ALLOWED',
      membership: subscription
        ? {
            branch: subscription.branch,
            endsAt: subscription.endsAt,
            id: subscription.id,
            plan: subscription.plan,
            remainingDays,
            status: subscription.status,
          }
        : null,
    };
  }

  async searchMembersForSubscription(rawQuery: string, user: AuthenticatedUser) {
    requireBranchId(user);
    const q = rawQuery.trim();
    if (q.length < 2) throw new BadRequestException('Enter at least two search characters');

    const members = await this.prisma.memberProfile.findMany({
      include: {
        homeBranch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
        subscriptions: {
          include: { branch: { select: { code: true, id: true, nameAr: true, nameEn: true } } },
          orderBy: { endsAt: 'desc' },
          take: 1,
        },
        user: {
          select: { avatarUrl: true, fullName: true, phone: true, status: true, username: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      where: {
        user: {
          role: UserRole.MEMBER,
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        },
      },
    });

    return members.map((member) => ({
      currentSubscription: member.subscriptions[0] ?? null,
      homeBranch: member.homeBranch,
      id: member.id,
      memberCode: member.memberCode,
      user: member.user,
    }));
  }

  async listSubscriptions(query: PaginationDto, user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
    const where: Prisma.SubscriptionWhereInput = {
      branchId,
      ...(query.q
        ? {
            member: {
              user: {
                OR: [
                  { fullName: { contains: query.q, mode: 'insensitive' as const } },
                  { username: { contains: query.q, mode: 'insensitive' as const } },
                  { phone: { contains: query.q, mode: 'insensitive' as const } },
                ],
              },
            },
          }
        : {}),
      ...(query.status ? { status: query.status as SubscriptionStatus } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        include: {
          member: {
            include: {
              homeBranch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
              user: {
                select: {
                  avatarUrl: true,
                  fullName: true,
                  id: true,
                  phone: true,
                  username: true,
                },
              },
            },
          },
          branch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
          plan: {
            select: {
              durationDays: true,
              id: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  async createSubscription(
    dto: CreateSubscriptionDto,
    admin: AuthenticatedUser,
    existingTx?: Prisma.TransactionClient,
  ) {
    const branchId = requireBranchId(admin);
    const observer = await this.requireActiveObserver(dto.observerId, admin);
    const run = async (transaction: Prisma.TransactionClient) => {
      // Serialize purchases for a member; retrying the same request cannot charge twice.
      await transaction.$queryRaw`SELECT id FROM "MemberProfile" WHERE id = ${dto.memberId} FOR UPDATE`;
      const duplicate = await transaction.payment.findUnique({
        where: { requestKey: dto.requestKey },
      });
      if (duplicate) {
        if (
          duplicate.branchIdSnapshot !== branchId ||
          duplicate.memberIdSnapshot !== dto.memberId ||
          duplicate.receivedById !== admin.id ||
          duplicate.planIdSnapshot !== dto.planId
        )
          throw new ConflictException('Payment request already used');
        return transaction.subscription.findUniqueOrThrow({
          where: { id: duplicate.subscriptionId },
        });
      }
      const member = await transaction.memberProfile.findUnique({
        include: { user: true },
        where: { id: dto.memberId },
      });
      if (!member) throw new NotFoundException('Member not found');
      if (member.user.status !== 'ACTIVE')
        throw new BadRequestException('Only active member accounts can start a subscription');
      const plan = await this.paidPlan(transaction, dto, branchId);
      const now = new Date();
      const current = await transaction.subscription.findFirst({
        orderBy: { endsAt: 'desc' },
        where: { memberId: member.id, status: { in: ['PENDING', 'ACTIVE', 'FROZEN'] } },
      });
      if (current) {
        const expired = await transaction.subscription.update({
          data: { endsAt: now, frozenAt: null, status: SubscriptionStatus.EXPIRED },
          where: { id: current.id },
        });
        await this.writeMembershipAudit(transaction, {
          action: MembershipAuditAction.EXPIRE,
          admin,
          branchId: current.branchId,
          memberId: member.id,
          newValue: subscriptionSnapshot(expired),
          observer,
          previousValue: subscriptionSnapshot(current),
          reason: 'بدء اشتراك مدفوع جديد في الفرع المختار',
          subscriptionId: current.id,
        });
      }
      const subscription = await transaction.subscription.create({
        data: {
          branchId,
          memberId: member.id,
          planId: plan.id,
          startsAt: now,
          endsAt: addDays(now, plan.durationDays),
          status: SubscriptionStatus.ACTIVE,
        },
      });
      await this.writeMembershipAudit(transaction, {
        action: MembershipAuditAction.CREATE,
        admin,
        branchId,
        memberId: member.id,
        newValue: subscriptionSnapshot(subscription),
        observer,
        previousValue: current ? subscriptionSnapshot(current) : {},
        reason: dto.reason || 'اشتراك مدفوع جديد',
        subscriptionId: subscription.id,
      });
      await this.recordPlanPayment(transaction, {
        admin,
        plan,
        observerName: observer.fullName,
        memberId: member.id,
        memberName: member.user.fullName,
        subscriptionId: subscription.id,
        requestKey: dto.requestKey,
      });
      return subscription;
    };
    return existingTx ? run(existingTx) : this.prisma.$transaction(run);
  }

  async mutateSubscription(
    id: string,
    action: MembershipAuditAction,
    dto: MembershipMutationDto,
    admin: AuthenticatedUser,
  ) {
    const observer = await this.requireActiveObserver(dto.observerId, admin);
    return this.prisma.$transaction(async (transaction) => {
      const initial = await transaction.subscription.findUnique({ where: { id } });
      if (!initial) throw new NotFoundException('Subscription not found');
      assertSameBranch(initial.branchId, admin);
      await transaction.$queryRaw`SELECT id FROM "MemberProfile" WHERE id = ${initial.memberId} FOR UPDATE`;
      const subscription = await transaction.subscription.findUniqueOrThrow({
        include: { member: { include: { user: true } } },
        where: { id },
      });
      if (action === MembershipAuditAction.RENEW) {
        const duplicate = await transaction.payment.findUnique({
          where: { requestKey: dto.requestKey },
        });
        if (duplicate) {
          if (
            duplicate.subscriptionId !== id ||
            duplicate.receivedById !== admin.id ||
            duplicate.planIdSnapshot !== dto.planId
          )
            throw new ConflictException('Payment request already used');
          return subscription;
        }
        const newer = await transaction.subscription.findFirst({
          where: {
            memberId: subscription.memberId,
            id: { not: id },
            status: { in: ['ACTIVE', 'FROZEN', 'PENDING'] },
          },
        });
        if (newer) throw new ConflictException('يوجد اشتراك أحدث لهذا اللاعب. افتح اشتراكه الحالي');
      }
      this.assertAllowedTransition(subscription.status, action);
      const now = new Date();
      const data: Prisma.SubscriptionUpdateInput = {};
      let plan: MembershipPlan | null = null;
      if (action === MembershipAuditAction.ADD_DAYS) {
        if (!dto.days) throw new BadRequestException('days is required');
        data.endsAt = addDays(subscription.endsAt > now ? subscription.endsAt : now, dto.days);
      }
      if (action === MembershipAuditAction.REMOVE_DAYS) {
        if (!dto.days) throw new BadRequestException('days is required');
        data.endsAt = addDays(subscription.endsAt, -dto.days);
        if (data.endsAt <= (subscription.frozenAt ?? now)) {
          data.frozenAt = null;
          data.status = SubscriptionStatus.EXPIRED;
        }
      }
      if (action === MembershipAuditAction.FREEZE) {
        data.frozenAt = now;
        data.status = SubscriptionStatus.FROZEN;
      }
      if (action === MembershipAuditAction.RESUME) {
        data.endsAt = addDays(now, diffDaysCeil(subscription.frozenAt ?? now, subscription.endsAt));
        data.frozenAt = null;
        data.status = SubscriptionStatus.ACTIVE;
      }
      if (action === MembershipAuditAction.RENEW) {
        if (subscription.member.user.status !== 'ACTIVE')
          throw new BadRequestException('Member account is not active');
        plan = await this.paidPlan(transaction, dto, subscription.branchId);
        data.endsAt = addDays(now, plan.durationDays);
        data.startsAt = now;
        data.frozenAt = null;
        data.plan = { connect: { id: plan.id } };
        data.status = SubscriptionStatus.ACTIVE;
      }
      if (action === MembershipAuditAction.EXPIRE) {
        data.endsAt = now;
        data.frozenAt = null;
        data.status = SubscriptionStatus.EXPIRED;
      }
      const updated = await transaction.subscription.update({ data, where: { id } });
      await this.writeMembershipAudit(transaction, {
        action,
        admin,
        branchId: subscription.branchId,
        memberId: subscription.memberId,
        newValue: subscriptionSnapshot(updated),
        observer,
        previousValue: subscriptionSnapshot(subscription),
        reason: dto.reason,
        subscriptionId: id,
      });
      // Administrative day adjustments never invent cash income.
      if (plan)
        await this.recordPlanPayment(transaction, {
          admin,
          plan,
          observerName: observer.fullName,
          memberId: subscription.memberId,
          memberName: subscription.member.user.fullName,
          subscriptionId: id,
          requestKey: dto.requestKey,
        });
      return updated;
    });
  }

  async listAuditLogs(query: PaginationDto, user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
    const where: Prisma.MembershipAuditLogWhereInput = {
      branchId,
      ...(query.q
        ? {
            OR: [
              { adminName: { contains: query.q, mode: 'insensitive' as const } },
              { observerName: { contains: query.q, mode: 'insensitive' as const } },
              { reason: { contains: query.q, mode: 'insensitive' as const } },
              {
                member: {
                  user: { fullName: { contains: query.q, mode: 'insensitive' as const } },
                },
              },
            ],
          }
        : {}),
      ...(query.action ? { action: query.action as MembershipAuditAction } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.membershipAuditLog.findMany({
        include: {
          admin: { select: { fullName: true, username: true } },
          member: { include: { user: { select: { fullName: true, username: true } } } },
          observer: true,
          subscription: true,
        },
        orderBy: { createdAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.membershipAuditLog.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  private async writeMembershipAudit(
    transaction: Prisma.TransactionClient,
    input: {
      action: MembershipAuditAction;
      admin: AuthenticatedUser;
      branchId: string;
      memberId: string;
      newValue: object;
      observer: { fullName: string; id: string };
      previousValue: object;
      reason: string;
      subscriptionId: string;
    },
  ) {
    if (!input.reason.trim()) {
      throw new BadRequestException('Reason is required');
    }
    await transaction.membershipAuditLog.create({
      data: {
        action: input.action,
        adminId: input.admin.id,
        adminName: input.admin.fullName,
        branchId: input.branchId,
        memberId: input.memberId,
        newValue: input.newValue,
        observerId: input.observer.id,
        observerName: input.observer.fullName,
        previousValue: input.previousValue,
        reason: input.reason,
        subscriptionId: input.subscriptionId,
      },
    });
    await transaction.auditLog.create({
      data: {
        action: AuditAction.MEMBERSHIP_CHANGE,
        actorId: input.admin.id,
        branchId: input.branchId,
        entityId: input.subscriptionId,
        entityType: 'Subscription',
        metadata: {
          action: input.action,
          newValue: input.newValue,
          observerId: input.observer.id,
          observerName: input.observer.fullName,
          previousValue: input.previousValue,
          reason: input.reason,
        },
      },
    });
  }

  private async recordPlanPayment(
    transaction: Prisma.TransactionClient,
    input: {
      admin: AuthenticatedUser;
      plan: MembershipPlan;
      observerName: string;
      memberId: string;
      memberName: string;
      subscriptionId: string;
      requestKey: string;
    },
  ) {
    await transaction.payment.create({
      data: {
        requestKey: input.requestKey,
        amountMinor: input.plan.priceMinor,
        currency: input.plan.currency,
        branchIdSnapshot: input.plan.branchId,
        planIdSnapshot: input.plan.id,
        planNameSnapshot: input.plan.nameAr,
        durationDaysSnapshot: input.plan.durationDays,
        memberIdSnapshot: input.memberId,
        memberNameSnapshot: input.memberName,
        receiverNameSnapshot: input.admin.fullName,
        observerNameSnapshot: input.observerName,
        method: 'CASH',
        status: 'PAID',
        paidAt: new Date(),
        receivedById: input.admin.id,
        subscriptionId: input.subscriptionId,
      },
    });
  }

  private async requireActiveObserver(
    requestedObserverId: string | undefined,
    admin: AuthenticatedUser,
  ) {
    const observerId =
      admin.role === UserRole.OBSERVER ? admin.shiftObserverId : requestedObserverId;
    if (!observerId) {
      throw new BadRequestException('Active shift observer is required');
    }
    const observer = await this.prisma.shiftObserver.findUnique({
      where: { id: observerId },
    });
    if (!observer || observer.deletedAt || observer.status !== ObserverStatus.ACTIVE) {
      throw new BadRequestException('Active shift observer is required');
    }
    if (observer.branchId !== requireBranchId(admin)) {
      throw new BadRequestException('Observer belongs to another Pro Gym branch');
    }
    return observer;
  }

  private assertAllowedTransition(status: SubscriptionStatus, action: MembershipAuditAction) {
    const allowed: Record<MembershipAuditAction, SubscriptionStatus[]> = {
      ADD_DAYS: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN],
      REMOVE_DAYS: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN],
      FREEZE: [SubscriptionStatus.ACTIVE],
      RESUME: [SubscriptionStatus.FROZEN],
      RENEW: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN, SubscriptionStatus.EXPIRED],
      EXPIRE: [SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN],
      CREATE: [],
    };
    if (!allowed[action].includes(status)) {
      throw new BadRequestException(`Cannot ${action.toLowerCase()} a ${status} subscription`);
    }
  }
}
