import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

import { GYM_TIME_ZONE, startOfGymDayInstant } from '../../common/utils/membership.util';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { timeZone: GYM_TIME_ZONE })
  async processDailyMembershipNotifications() {
    const now = new Date();
    const reminderCutoff = new Date(now.getTime() + 5 * 86_400_000);

    await this.prisma.subscription.updateMany({
      data: { status: 'EXPIRED' },
      where: { endsAt: { lte: now }, status: 'ACTIVE' },
    });

    const expiring = await this.prisma.subscription.findMany({
      include: { member: { select: { userId: true } } },
      where: {
        endsAt: { gt: now, lte: reminderCutoff },
        status: 'ACTIVE',
      },
    });

    for (const subscription of expiring) {
      const remainingDays = Math.max(
        1,
        Math.ceil((subscription.endsAt.getTime() - now.getTime()) / 86_400_000),
      );
      await this.ensureMembershipExpiryReminder({
        endsAt: subscription.endsAt,
        remainingDays,
        subscriptionId: subscription.id,
        userId: subscription.member.userId,
      });
    }

    return { expired: true, remindersProcessed: expiring.length };
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      where: { userId },
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { readAt: null, userId },
    });
  }

  async create(input: {
    actionUrl?: string;
    bodyAr: string;
    metadata?: Prisma.InputJsonObject;
    titleAr: string;
    type?: NotificationType;
    userId: string;
  }) {
    return this.prisma.notification.create({
      data: {
        actionUrl: input.actionUrl,
        bodyAr: input.bodyAr,
        metadata: input.metadata,
        titleAr: input.titleAr,
        type: input.type ?? NotificationType.SYSTEM,
        userId: input.userId,
      },
    });
  }

  async ensureMembershipExpiryReminder(input: {
    endsAt: Date;
    remainingDays: number;
    subscriptionId: string;
    userId: string;
  }) {
    const today = startOfGymDayInstant(new Date());
    const existing = await this.prisma.notification.findFirst({
      where: {
        createdAt: { gte: today },
        titleAr: 'اشتراكك قارب على الانتهاء',
        type: NotificationType.MEMBERSHIP,
        userId: input.userId,
      },
    });

    if (existing) return existing;

    return this.create({
      actionUrl: '/ar/dashboard/member',
      bodyAr: `باقي ${input.remainingDays} يوم على انتهاء اشتراكك في Pro Gym. يرجى مراجعة الإدارة للتجديد والاستمرار بدون انقطاع.`,
      metadata: {
        endsAt: input.endsAt.toISOString(),
        remainingDays: input.remainingDays,
        subscriptionId: input.subscriptionId,
      },
      titleAr: 'اشتراكك قارب على الانتهاء',
      type: NotificationType.MEMBERSHIP,
      userId: input.userId,
    });
  }

  async ensureCoachSubscriptionExpiryReminder(input: {
    assignmentId: string;
    coachName: string;
    coachUserId: string;
    endsAt: Date;
    memberName: string;
    memberUserId: string;
    remainingDays: number;
  }) {
    const today = startOfGymDayInstant(new Date());
    const titleAr = 'موعد تجديد التدريب الخاص اقترب';
    const existing = await this.prisma.notification.findMany({
      select: { userId: true },
      where: {
        createdAt: { gte: today },
        titleAr,
        type: NotificationType.COACHING,
        userId: { in: [input.memberUserId, input.coachUserId] },
      },
    });
    const notified = new Set(existing.map((notification) => notification.userId));
    const notifications = [];

    if (!notified.has(input.memberUserId)) {
      notifications.push({
        actionUrl: '/ar/dashboard/member',
        bodyAr: `باقي ${input.remainingDays} أيام جميلة مع الكوتش ${input.coachName}. تواصل معه لتجديد التدريب الخاص والاستمرار بدون انقطاع.`,
        metadata: {
          assignmentId: input.assignmentId,
          endsAt: input.endsAt.toISOString(),
          remainingDays: input.remainingDays,
        },
        titleAr,
        type: NotificationType.COACHING,
        userId: input.memberUserId,
      });
    }

    if (!notified.has(input.coachUserId)) {
      notifications.push({
        actionUrl: '/ar/dashboard/coach/clients',
        bodyAr: `باقي ${input.remainingDays} أيام على اشتراك التدريب الخاص للاعب ${input.memberName}. تواصل معه لتأكيد التجديد.`,
        metadata: {
          assignmentId: input.assignmentId,
          endsAt: input.endsAt.toISOString(),
          remainingDays: input.remainingDays,
        },
        titleAr,
        type: NotificationType.COACHING,
        userId: input.coachUserId,
      });
    }

    if (notifications.length) {
      await this.prisma.notification.createMany({ data: notifications });
    }
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.update({
      data: { readAt: new Date() },
      where: { id, userId },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      data: { readAt: new Date() },
      where: { readAt: null, userId },
    });

    return { success: true };
  }
}
