import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { GYM_TIME_ZONE, gymDate } from '../../common/utils/membership.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import type { ReportQueryDto, ReportMetric } from './dto/reports.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const today = gymDate(now);
    const weekAgo = new Date(today.getTime() - 7 * 86_400_000);
    const monthAgo = new Date(today.getTime() - 30 * 86_400_000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60_000);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 86_400_000);

    const [
      totalMembers,
      activeMembers,
      expiredSubscriptions,
      expiringSoonSubscriptions,
      frozenSubscriptions,
      totalCoaches,
      dailyAttendance,
      weeklyAttendance,
      monthlyAttendance,
      liveInGym,
      todayAttendanceRecords,
      clientsPerCoach,
      memberGrowth,
      attendanceTrend,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.MEMBER } }),
      this.prisma.memberProfile.count({
        where: { subscriptions: { some: { endsAt: { gt: now }, status: 'ACTIVE' } } },
      }),
      this.prisma.memberProfile.count({
        where: {
          subscriptions: {
            none: {
              OR: [
                { endsAt: { gt: now }, status: 'ACTIVE' },
                { status: { in: ['PENDING', 'FROZEN'] } },
              ],
            },
            some: { OR: [{ status: 'EXPIRED' }, { endsAt: { lte: now } }] },
          },
        },
      }),
      this.prisma.memberProfile.count({
        where: {
          subscriptions: {
            some: {
              endsAt: { gte: now, lte: fiveDaysFromNow },
              status: 'ACTIVE',
            },
          },
        },
      }),
      this.prisma.memberProfile.count({
        where: { subscriptions: { some: { status: 'FROZEN' } } },
      }),
      this.prisma.user.count({ where: { role: UserRole.COACH } }),
      this.prisma.attendanceRecord.count({
        where: { attendanceDate: today, voidedAt: null },
      }),
      this.prisma.attendanceRecord.count({
        where: { attendanceDate: { gte: weekAgo }, voidedAt: null },
      }),
      this.prisma.attendanceRecord.count({
        where: { attendanceDate: { gte: monthAgo }, voidedAt: null },
      }),
      this.prisma.attendanceRecord.count({
        where: { checkedInAt: { gte: oneHourAgo }, voidedAt: null },
      }),
      this.prisma.attendanceRecord.findMany({
        orderBy: { checkedInAt: 'asc' },
        select: { checkedInAt: true },
        where: { attendanceDate: today, voidedAt: null },
      }),
      this.prisma.coachProfile.findMany({
        include: {
          _count: { select: { assignments: { where: { status: 'ACTIVE' } } } },
          user: { select: { fullName: true } },
        },
      }),
      this.prisma.memberProfile.findMany({
        orderBy: { joinedAt: 'asc' },
        select: { joinedAt: true },
        take: 500,
      }),
      this.prisma.attendanceRecord.findMany({
        orderBy: { attendanceDate: 'asc' },
        select: { attendanceDate: true },
        where: { attendanceDate: { gte: monthAgo }, voidedAt: null },
      }),
    ]);

    return {
      attendance: {
        daily: dailyAttendance,
        hourlyToday: this.bucketByHour(todayAttendanceRecords.map((item) => item.checkedInAt)),
        liveInGym,
        monthly: monthlyAttendance,
        weekly: weeklyAttendance,
      },
      coaches: {
        clientsPerCoach: clientsPerCoach.map((coach) => ({
          clients: coach._count.assignments,
          coach: coach.user.fullName,
          coachId: coach.id,
        })),
        total: totalCoaches,
      },
      growth: {
        attendanceTrend: this.bucketByDay(attendanceTrend.map((item) => item.attendanceDate)),
        memberGrowth: this.bucketByDay(memberGrowth.map((item) => item.joinedAt)),
      },
      members: {
        active: activeMembers,
        expired: expiredSubscriptions,
        expiringSoon: expiringSoonSubscriptions,
        frozen: frozenSubscriptions,
        total: totalMembers,
      },
    };
  }

  async reportSettings() {
    const settings = await this.prisma.gymSettings.findUnique({
      where: { singletonKey: 'primary' },
    });
    return {
      membershipCurrency: settings?.membershipCurrency ?? 'USD',
      monthlySubscriptionPriceMinor: settings?.monthlySubscriptionPriceMinor ?? 2500,
    };
  }

  async updateReportSettings(monthlySubscriptionPriceMinor: number, admin: AuthenticatedUser) {
    const settings = await this.prisma.gymSettings.upsert({
      create: {
        membershipCurrency: 'USD',
        monthlySubscriptionPriceMinor,
        nameAr: 'Pro Gym',
        nameEn: 'Pro Gym',
        singletonKey: 'primary',
      },
      update: { membershipCurrency: 'USD', monthlySubscriptionPriceMinor },
      where: { singletonKey: 'primary' },
    });
    await this.prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        actorId: admin.id,
        entityId: settings.id,
        entityType: 'GymSettings',
        metadata: { membershipCurrency: 'USD', monthlySubscriptionPriceMinor },
      },
    });
    return this.reportSettings();
  }

  async report(query: ReportQueryDto) {
    const { from, toExclusive, toInclusive } = this.parseReportRange(query.from, query.to);
    const metrics: ReportMetric[] = query.metrics?.length
      ? query.metrics
      : ['members', 'subscriptions', 'revenue', 'attendance', 'coaches', 'registrations'];
    const now = new Date();

    const [
      settings,
      totalMembers,
      newMembers,
      startedSubscriptions,
      renewals,
      activeSubscriptions,
      payments,
      attendanceRecords,
      totalCoaches,
      activeCoachAssignments,
      registrationRequests,
    ] = await Promise.all([
      this.reportSettings(),
      this.prisma.user.count({ where: { role: UserRole.MEMBER } }),
      this.prisma.memberProfile.count({ where: { joinedAt: { gte: from, lt: toExclusive } } }),
      this.prisma.subscription.count({ where: { startsAt: { gte: from, lt: toExclusive } } }),
      this.prisma.membershipAuditLog.count({
        where: { action: 'RENEW', createdAt: { gte: from, lt: toExclusive } },
      }),
      this.prisma.subscription.count({
        where: { endsAt: { gt: now }, status: 'ACTIVE', startsAt: { lte: now } },
      }),
      this.prisma.payment.findMany({
        orderBy: { paidAt: 'asc' },
        select: { amountMinor: true, paidAt: true },
        where: { paidAt: { gte: from, lt: toExclusive }, status: 'PAID' },
      }),
      this.prisma.attendanceRecord.findMany({
        orderBy: { attendanceDate: 'asc' },
        select: { attendanceDate: true, memberId: true },
        where: { attendanceDate: { gte: from, lt: toExclusive }, voidedAt: null },
      }),
      this.prisma.user.count({ where: { role: UserRole.COACH } }),
      this.prisma.coachAssignment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.registrationRequest.findMany({
        select: { status: true },
        where: { createdAt: { gte: from, lt: toExclusive } },
      }),
    ]);

    const attendanceByDay = this.fillDailyRange(
      from,
      toInclusive,
      attendanceRecords.map((item) => ({
        date: item.attendanceDate,
        value: 1,
      })),
    );
    const revenueByDay = this.fillDailyRange(
      from,
      toInclusive,
      payments.flatMap((item) =>
        item.paidAt ? [{ date: item.paidAt, value: item.amountMinor }] : [],
      ),
    );
    const statusCount = (status: 'PENDING' | 'APPROVED' | 'REJECTED') =>
      registrationRequests.filter((item) => item.status === status).length;

    return {
      attendance: {
        byDay: attendanceByDay,
        uniqueMembers: new Set(attendanceRecords.map((item) => item.memberId)).size,
        visits: attendanceRecords.length,
      },
      coaches: { activeAssignments: activeCoachAssignments, total: totalCoaches },
      generatedAt: new Date().toISOString(),
      members: { new: newMembers, total: totalMembers },
      metrics,
      range: {
        from: query.from.slice(0, 10),
        to: query.to.slice(0, 10),
      },
      registrations: {
        approved: statusCount('APPROVED'),
        pending: statusCount('PENDING'),
        rejected: statusCount('REJECTED'),
        total: registrationRequests.length,
      },
      revenue: {
        byDay: revenueByDay,
        currency: settings.membershipCurrency,
        monthlySubscriptionPriceMinor: settings.monthlySubscriptionPriceMinor,
        paidPayments: payments.length,
        totalMinor: payments.reduce((sum, payment) => sum + payment.amountMinor, 0),
      },
      subscriptions: {
        active: activeSubscriptions,
        renewed: renewals,
        started: startedSubscriptions,
      },
    };
  }

  private parseReportRange(fromValue: string, toValue: string) {
    const from = new Date(`${fromValue.slice(0, 10)}T00:00:00.000Z`);
    const toInclusive = new Date(`${toValue.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(toInclusive.getTime()) || from > toInclusive) {
      throw new BadRequestException('Invalid report date range');
    }
    const days = Math.floor((toInclusive.getTime() - from.getTime()) / 86_400_000) + 1;
    if (days > 366) throw new BadRequestException('Report range cannot exceed 366 days');
    return { from, toExclusive: new Date(toInclusive.getTime() + 86_400_000), toInclusive };
  }

  private fillDailyRange(from: Date, to: Date, items: Array<{ date: Date; value: number }>) {
    const values = new Map<string, number>();
    for (const item of items) {
      const key = item.date.toISOString().slice(0, 10);
      values.set(key, (values.get(key) ?? 0) + item.value);
    }
    const result: Array<{ date: string; value: number }> = [];
    for (let cursor = from.getTime(); cursor <= to.getTime(); cursor += 86_400_000) {
      const date = new Date(cursor).toISOString().slice(0, 10);
      result.push({ date, value: values.get(date) ?? 0 });
    }
    return result;
  }

  private bucketByDay(dates: Date[]) {
    const buckets = new Map<string, number>();

    for (const date of dates) {
      const key = gymDate(date).toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return Array.from(buckets, ([date, count]) => ({ count, date }));
  }

  private bucketByHour(dates: Date[]) {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      count: 0,
      hour: `${hour.toString().padStart(2, '0')}:00`,
    }));

    for (const date of dates) {
      const hour = Number(
        new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          hourCycle: 'h23',
          timeZone: GYM_TIME_ZONE,
        }).format(date),
      );
      buckets[hour]!.count += 1;
    }

    return buckets;
  }
}
