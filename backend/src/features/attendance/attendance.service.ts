import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceSource, AuditAction, NotificationType } from '@prisma/client';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import type { PaginationDto } from '../../common/dto/pagination.dto';
import { hashToken, randomToken } from '../../common/utils/hash.util';
import { gymDate, startOfGymMonth } from '../../common/utils/membership.util';
import { paginated, paginationArgs } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly memberships: MembershipsService,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  async createQr(admin: AuthenticatedUser, expiresInMinutes: number) {
    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);
    const session = await this.prisma.attendanceQrSession.create({
      data: {
        createdById: admin.id,
        expiresAt,
        tokenHash: hashToken(token),
      },
    });

    return {
      expiresAt,
      id: session.id,
      token,
      url: `/ar/attendance?token=${encodeURIComponent(token)}`,
    };
  }

  async scan(user: AuthenticatedUser, token: string) {
    if (!user.memberProfileId) {
      throw new BadRequestException('Only members can scan attendance QR codes');
    }

    const session = await this.prisma.attendanceQrSession.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      throw new BadRequestException('Attendance QR is invalid or expired');
    }

    return this.recordAttendance(user.memberProfileId, AttendanceSource.QR, session.id);
  }

  async entry(user: AuthenticatedUser) {
    if (!user.memberProfileId) {
      throw new BadRequestException('Only members can record entry');
    }
    return this.recordAttendance(user.memberProfileId, AttendanceSource.QR, null);
  }

  async manualRecord(admin: AuthenticatedUser, memberId: string, notes?: string) {
    const result = await this.recordAttendance(memberId, AttendanceSource.ADMIN, null, notes);
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.ATTENDANCE,
        actorId: admin.id,
        entityId: result.checkIn.id,
        entityType: 'AttendanceRecord',
        metadata: { action: 'MANUAL_CREATE', memberId, notes: notes ?? null },
      },
    });
    return result;
  }

  async memberHistory(memberId: string, query: PaginationDto) {
    const now = new Date();
    const monthStart = startOfGymMonth(now);
    const [records, monthlyCount, totalCount] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.findMany({
        orderBy: { checkedInAt: 'desc' },
        where: { memberId, voidedAt: null },
        ...paginationArgs(query),
      }),
      this.prisma.attendanceRecord.count({
        where: { checkedInAt: { gte: monthStart }, memberId, voidedAt: null },
      }),
      this.prisma.attendanceRecord.count({ where: { memberId, voidedAt: null } }),
    ]);

    return {
      meta: paginated(records, totalCount, query).meta,
      monthlyCount,
      records,
      totalCount,
    };
  }

  async adminList(query: PaginationDto) {
    const where = query.q
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
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.findMany({
        include: {
          member: {
            include: {
              subscriptions: { include: { plan: true }, orderBy: { endsAt: 'desc' }, take: 1 },
              user: true,
            },
          },
        },
        orderBy: { checkedInAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  async recentCheckIns(take = 8) {
    const records = await this.prisma.attendanceRecord.findMany({
      include: {
        member: {
          include: {
            subscriptions: { include: { plan: true }, orderBy: { endsAt: 'desc' }, take: 1 },
            user: true,
          },
        },
      },
      orderBy: { checkedInAt: 'desc' },
      take,
      where: { voidedAt: null },
    });

    return records.map((record) => {
      const subscription = record.member.subscriptions[0] ?? null;
      const remainingDays = subscription
        ? Math.max(0, Math.ceil((subscription.endsAt.getTime() - Date.now()) / 86_400_000))
        : 0;

      return {
        checkedInAt: record.checkedInAt,
        id: record.id,
        member: {
          avatarUrl: record.member.user.avatarUrl,
          goal: record.member.fitnessGoal,
          name: record.member.user.fullName,
          phone: record.member.user.phone,
        },
        membership: {
          plan: subscription?.plan?.nameAr ?? null,
          remainingDays,
          status: subscription?.status ?? 'NONE',
        },
        source: record.source,
      };
    });
  }

  async voidRecord(id: string, reason: string, admin: AuthenticatedUser) {
    if (!reason.trim()) throw new BadRequestException('Reason is required');
    const record = await this.prisma.attendanceRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Attendance record not found');
    if (record.voidedAt) throw new ConflictException('Attendance record is already voided');

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.attendanceRecord.update({
        data: {
          voidedAt: new Date(),
          voidedById: admin.id,
          voidReason: reason.trim(),
        },
        where: { id },
      });
      await transaction.auditLog.create({
        data: {
          action: AuditAction.ATTENDANCE,
          actorId: admin.id,
          entityId: id,
          entityType: 'AttendanceRecord',
          metadata: {
            action: 'VOID',
            memberId: record.memberId,
            reason: reason.trim(),
          },
        },
      });
      return updated;
    });
  }

  private async recordAttendance(
    memberId: string,
    source: AttendanceSource,
    sessionId?: string | null,
    notes?: string,
  ) {
    const member = await this.prisma.memberProfile.findUnique({
      include: { user: true },
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const previousCheckIn = await this.prisma.attendanceRecord.findFirst({
      orderBy: { checkedInAt: 'desc' },
      select: { checkedInAt: true },
      where: { memberId, voidedAt: null },
    });
    const attendanceDate = gymDate(new Date());

    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { attendanceDate, memberId, voidedAt: null },
    });

    if (existing) {
      throw new ConflictException('Attendance already recorded today');
    }

    const record = await this.prisma.attendanceRecord.create({
      data: {
        attendanceDate,
        memberId,
        notes,
        sessionId,
        source,
      },
    });
    const membership = await this.memberships.getMembershipSummary(memberId);

    await this.notifications.create({
      bodyAr: `تم تسجيل حضورك بتاريخ ${record.checkedInAt.toLocaleDateString('ar')}`,
      metadata: { attendanceRecordId: record.id },
      titleAr: 'تم تسجيل الحضور',
      type: NotificationType.ATTENDANCE,
      userId: member.userId,
    });

    return {
      checkIn: record,
      member: {
        goal: member.fitnessGoal,
        name: member.user.fullName,
        photoUrl: member.user.avatarUrl,
      },
      membership,
      message:
        membership.status === 'ACTIVE'
          ? 'تم تسجيل الحضور بنجاح'
          : 'تم تسجيل الحضور، يرجى مراجعة الإدارة بخصوص الاشتراك',
      previousCheckIn: previousCheckIn?.checkedInAt ?? null,
    };
  }
}
