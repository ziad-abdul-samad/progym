import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { GYM_TIME_ZONE, gymDate } from '../../common/utils/membership.util';
import { PrismaService } from '../../prisma/prisma.service';

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
