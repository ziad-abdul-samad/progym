import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CoachProfileChangeStatus,
  NotificationType,
  ObserverStatus,
  Prisma,
  QrInvitePurpose,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import type { PaginationDto } from '../../common/dto/pagination.dto';
import { ageFromDateOfBirth } from '../../common/utils/age.util';
import {
  hashPassword,
  hashToken,
  normalizeUsername,
  randomToken,
} from '../../common/utils/hash.util';
import { paginated, paginationArgs } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  AdminCreateCoachDto,
  AdminCreateMemberDto,
  AdminNotificationDto,
  AdminUpdateUserDto,
  AssignClientDto,
  CreateObserverDto,
  CreateRegistrationQrDto,
  DemoteCoachDto,
  ResetPasswordByAdminDto,
  UpdateObserverDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async members(query: PaginationDto) {
    const where: Prisma.MemberProfileWhereInput = {
      user: {
        ...(query.status ? { status: query.status as UserStatus } : {}),
        ...(query.q
          ? {
              OR: [
                { fullName: { contains: query.q, mode: 'insensitive' as const } },
                { username: { contains: query.q, mode: 'insensitive' as const } },
                { phone: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      ...(query.membershipStatus === 'NONE'
        ? { subscriptions: { none: {} } }
        : query.membershipStatus
          ? {
              subscriptions: {
                some: { status: query.membershipStatus as SubscriptionStatus },
              },
            }
          : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.memberProfile.findMany({
        include: {
          assignments: {
            where: { status: 'ACTIVE' },
            include: { coach: { include: { user: true } } },
          },
          subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 },
          user: true,
        },
        orderBy: { joinedAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.memberProfile.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  async createMember(dto: AdminCreateMemberDto, admin: AuthenticatedUser) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Production member registration requires a QR invite');
    }
    const username = normalizeUsername(dto.username);
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { phone: dto.phone }] },
    });

    if (existing) throw new ConflictException('Username or phone already exists');
    const dateOfBirth = new Date(dto.dateOfBirth);
    const age = ageFromDateOfBirth(dateOfBirth);
    if (age < 10 || age > 100) {
      throw new BadRequestException('Date of birth must represent an age between 10 and 100');
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        passwordHash: await hashPassword(dto.password),
        phone: dto.phone,
        role: UserRole.MEMBER,
        username,
        memberProfile: {
          create: {
            currentWeightKg: dto.weightKg,
            dateOfBirth,
            fitnessGoal: dto.fitnessGoal,
            gender: dto.gender,
            heightCm: dto.heightCm,
            memberCode: `PG-${randomToken(5).toUpperCase()}`,
          },
        },
      },
      include: { memberProfile: true },
    });

    await this.audit(admin, AuditAction.CREATE, 'User', user.id, { role: user.role });
    return user;
  }

  async auditLog(query: PaginationDto) {
    const where: Prisma.AuditLogWhereInput = query.q
      ? {
          OR: [
            { entityType: { contains: query.q, mode: 'insensitive' } },
            { actor: { fullName: { contains: query.q, mode: 'insensitive' } } },
            { actor: { username: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        include: { actor: { select: { fullName: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(items, total, query);
  }

  async updateUser(id: string, dto: AdminUpdateUserDto, admin: AuthenticatedUser) {
    const user = await this.prisma.user.update({ data: dto, where: { id } });
    await this.audit(admin, AuditAction.UPDATE, 'User', id, { ...dto });
    return user;
  }

  async setUserStatus(id: string, status: UserStatus, admin: AuthenticatedUser) {
    const user = await this.prisma.user.update({ data: { status }, where: { id } });
    await this.audit(admin, AuditAction.UPDATE, 'User', id, { status });
    return user;
  }

  async resetPassword(id: string, dto: ResetPasswordByAdminDto, admin: AuthenticatedUser) {
    const user = await this.prisma.user.update({
      data: { passwordHash: await hashPassword(dto.newPassword) },
      where: { id },
    });
    await this.prisma.refreshSession.updateMany({
      data: { revokedAt: new Date() },
      where: { userId: id, revokedAt: null },
    });
    await this.audit(admin, AuditAction.PASSWORD_RESET, 'User', id, { username: user.username });
    return { success: true };
  }

  async coaches(query: PaginationDto) {
    const where: Prisma.CoachProfileWhereInput = query.q
      ? {
          user: {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { username: { contains: query.q, mode: 'insensitive' } },
            ],
          },
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.coachProfile.findMany({
        include: {
          _count: { select: { assignments: true } },
          assignments: {
            include: {
              member: {
                include: { user: { select: { fullName: true, phone: true, username: true } } },
              },
            },
            orderBy: { startedAt: 'desc' },
            where: { status: { in: ['ACTIVE', 'PAUSED'] } },
          },
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.coachProfile.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  async coachSubscriptionEvents() {
    return this.prisma.coachSubscriptionEvent.findMany({
      include: {
        assignment: {
          select: {
            coachingEndsAt: true,
            coachingStartsAt: true,
            planRequirement: true,
            status: true,
          },
        },
        coach: { include: { user: { select: { fullName: true, username: true } } } },
        member: {
          include: {
            user: { select: { avatarUrl: true, fullName: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async coachProfileChangeRequests() {
    return this.prisma.coachProfileChangeRequest.findMany({
      include: {
        coach: { include: { user: true } },
        reviewer: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async memberProfileChangeRequests() {
    return this.prisma.memberProfileChangeRequest.findMany({
      include: {
        member: { include: { user: true } },
        reviewer: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async reviewMemberProfileChange(
    id: string,
    approve: boolean,
    reason: string | undefined,
    admin: AuthenticatedUser,
  ) {
    if (!approve && !reason?.trim()) {
      throw new BadRequestException('سبب الرفض مطلوب');
    }

    const request = await this.prisma.memberProfileChangeRequest.findUnique({
      include: { member: { include: { user: true } } },
      where: { id },
    });
    if (!request || request.status !== CoachProfileChangeStatus.PENDING) {
      throw new NotFoundException('طلب تعديل بيانات العضو غير موجود أو تمت مراجعته');
    }

    const requested = request.requestedData as Record<string, unknown>;
    if (
      approve &&
      typeof requested.phone === 'string' &&
      requested.phone !== request.member.user.phone
    ) {
      const duplicate = await this.prisma.user.findFirst({
        where: { id: { not: request.member.userId }, phone: requested.phone },
      });
      if (duplicate) throw new ConflictException('رقم الهاتف مستخدم في حساب آخر');
    }

    const userData: Prisma.UserUpdateInput = {};
    const memberData: Prisma.MemberProfileUpdateInput = {};
    const history: Array<{ field: string; newValue: string; previousValue: string }> = [];

    if (typeof requested.fullName === 'string') {
      userData.fullName = requested.fullName;
      history.push({
        field: 'fullName',
        newValue: requested.fullName,
        previousValue: request.member.user.fullName,
      });
    }
    if (typeof requested.phone === 'string') {
      userData.phone = requested.phone;
      history.push({
        field: 'phone',
        newValue: requested.phone,
        previousValue: request.member.user.phone,
      });
    }
    if (typeof requested.heightCm === 'number') {
      memberData.heightCm = requested.heightCm;
      history.push({
        field: 'heightCm',
        newValue: String(requested.heightCm),
        previousValue: String(request.member.heightCm),
      });
    }
    if (typeof requested.currentWeightKg === 'number') {
      memberData.currentWeightKg = requested.currentWeightKg;
      history.push({
        field: 'currentWeightKg',
        newValue: String(requested.currentWeightKg),
        previousValue: String(request.member.currentWeightKg),
      });
    }
    if (request.stagedAvatarId) {
      userData.avatarUrl = `/api/v1/files/${request.stagedAvatarId}`;
      history.push({
        field: 'avatarUrl',
        newValue: String(userData.avatarUrl),
        previousValue: request.member.user.avatarUrl ?? '',
      });
    }

    const status = approve ? CoachProfileChangeStatus.APPROVED : CoachProfileChangeStatus.REJECTED;
    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.memberProfileChangeRequest.update({
        data: {
          reviewReason: reason,
          reviewedAt: new Date(),
          reviewerId: admin.id,
          status,
        },
        where: { id },
      }),
      this.prisma.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          actorId: admin.id,
          entityId: id,
          entityType: 'MemberProfileChangeRequest',
          metadata: { approve, reason: reason ?? null, requestedData: request.requestedData },
        },
      }),
    ];

    if (approve && Object.keys(userData).length) {
      operations.push(
        this.prisma.user.update({ data: userData, where: { id: request.member.userId } }),
      );
    }
    if (approve && Object.keys(memberData).length) {
      operations.push(
        this.prisma.memberProfile.update({ data: memberData, where: { id: request.memberId } }),
      );
    }
    if (approve && history.length) {
      operations.push(
        this.prisma.profileUpdateHistory.createMany({
          data: history.map((item) => ({ ...item, userId: request.member.userId })),
        }),
      );
    }
    if (approve && typeof requested.currentWeightKg === 'number') {
      operations.push(
        this.prisma.progressEntry.create({
          data: {
            authorUserId: request.member.userId,
            measuredAt: new Date(),
            memberId: request.memberId,
            notes: 'Approved profile weight update',
            weightKg: requested.currentWeightKg,
          },
        }),
      );
    }

    await this.prisma.$transaction(operations);

    if (!approve && request.stagedAvatarId) {
      await this.storage.deleteAsset(request.stagedAvatarId);
    }

    await this.notifications.create({
      actionUrl: '/ar/dashboard/member/profile',
      bodyAr: approve
        ? 'وافقت الإدارة على تحديث بيانات ملفك الشخصي.'
        : `رفضت الإدارة طلب التعديل${reason ? `: ${reason}` : '.'}`,
      metadata: { profileChangeRequestId: id, status },
      titleAr: approve ? 'تم اعتماد تحديث بياناتك' : 'تم رفض طلب تعديل البيانات',
      type: NotificationType.SYSTEM,
      userId: request.member.userId,
    });

    return { approved: approve, id, status };
  }

  async reviewCoachProfileChange(
    id: string,
    approve: boolean,
    reason: string | undefined,
    admin: AuthenticatedUser,
  ) {
    const request = await this.prisma.coachProfileChangeRequest.findUnique({
      include: { coach: { include: { user: true } } },
      where: { id },
    });
    if (!request || request.status !== CoachProfileChangeStatus.PENDING) {
      throw new NotFoundException('Pending coach profile change request not found');
    }

    const requestedData = request.requestedData as Record<string, unknown>;
    const userData: { fullName?: string; phone?: string } = {};
    const coachData: { bioAr?: string } = {};
    if (typeof requestedData.fullName === 'string') userData.fullName = requestedData.fullName;
    if (typeof requestedData.phone === 'string') userData.phone = requestedData.phone;
    if (typeof requestedData.bioAr === 'string') coachData.bioAr = requestedData.bioAr;
    const status = approve ? CoachProfileChangeStatus.APPROVED : CoachProfileChangeStatus.REJECTED;

    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.coachProfileChangeRequest.update({
        data: {
          reviewReason: reason,
          reviewedAt: new Date(),
          reviewerId: admin.id,
          status,
        },
        where: { id },
      }),
      this.prisma.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          actorId: admin.id,
          entityId: id,
          entityType: 'CoachProfileChangeRequest',
          metadata: {
            approve,
            reason: reason ?? null,
            requestedData: request.requestedData as Prisma.InputJsonValue,
          },
        },
      }),
    ];

    if (approve && Object.keys(userData).length) {
      operations.push(
        this.prisma.user.update({ data: userData, where: { id: request.coach.userId } }),
      );
    }
    if (approve && Object.keys(coachData).length) {
      operations.push(
        this.prisma.coachProfile.update({ data: coachData, where: { id: request.coachId } }),
      );
    }

    await this.prisma.$transaction(operations);
    return { approved: approve, id, status };
  }

  async createCoach(dto: AdminCreateCoachDto, admin: AuthenticatedUser) {
    const username = normalizeUsername(dto.username);
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { phone: dto.phone }] },
    });

    if (existing) throw new ConflictException('Username or phone already exists');

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        passwordHash: await hashPassword(dto.password),
        phone: dto.phone,
        role: UserRole.COACH,
        username,
        coachProfile: {
          create: {
            isPublic: false,
            specialties:
              dto.specialties
                ?.split(',')
                .map((item) => item.trim())
                .filter(Boolean) ?? [],
          },
        },
      },
      include: { coachProfile: true },
    });

    await this.audit(admin, AuditAction.CREATE, 'User', user.id, { role: user.role });
    return user;
  }

  async promoteMemberToCoach(userId: string, admin: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      include: { coachProfile: true },
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      data: {
        role: UserRole.COACH,
        coachProfile: user.coachProfile
          ? undefined
          : {
              create: {
                isPublic: false,
                specialties: [],
              },
            },
      },
      include: { coachProfile: true, memberProfile: true },
      where: { id: userId },
    });

    await this.audit(admin, AuditAction.ROLE_CHANGE, 'User', userId, {
      from: user.role,
      to: UserRole.COACH,
    });
    return updated;
  }

  async demoteCoachToMember(userId: string, dto: DemoteCoachDto, admin: AuthenticatedUser) {
    if (!dto.reason.trim()) {
      throw new BadRequestException('Reason is required');
    }

    const user = await this.prisma.user.findUnique({
      include: { coachProfile: true },
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.COACH || !user.coachProfile) {
      throw new BadRequestException('User is not an active coach');
    }

    const activeAssignments = await this.prisma.coachAssignment.findMany({
      select: {
        id: true,
        member: { select: { userId: true, user: { select: { fullName: true } } } },
      },
      where: { coachId: user.coachProfile.id, status: 'ACTIVE' },
    });

    const endedAt = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        data: { role: UserRole.MEMBER },
        include: { coachProfile: true, memberProfile: true },
        where: { id: userId },
      }),
      this.prisma.coachAssignment.updateMany({
        data: { endedAt, status: 'ENDED' },
        where: { coachId: user.coachProfile.id, status: 'ACTIVE' },
      }),
      this.prisma.auditLog.create({
        data: {
          action: AuditAction.ROLE_CHANGE,
          actorId: admin.id,
          entityId: userId,
          entityType: 'User',
          metadata: {
            endedAssignmentIds: activeAssignments.map((assignment) => assignment.id),
            endedAssignments: activeAssignments.length,
            from: user.role,
            reason: dto.reason,
            to: UserRole.MEMBER,
          },
        },
      }),
    ]);

    if (activeAssignments.length) {
      await this.prisma.notification.createMany({
        data: activeAssignments.map((assignment) => ({
          actionUrl: '/ar/dashboard/member',
          bodyAr: 'تم تحديث حالة التدريب الخاص. يرجى مراجعة الإدارة لاختيار مدرب جديد عند الحاجة.',
          metadata: {
            coachUserId: userId,
            reason: dto.reason,
          },
          titleAr: 'تحديث في التدريب الخاص',
          type: NotificationType.COACHING,
          userId: assignment.member.userId,
        })),
      });
    }

    return {
      endedAssignments: activeAssignments.length,
      user: updated,
    };
  }

  async assignClient(dto: AssignClientDto, admin: AuthenticatedUser) {
    const member = await this.prisma.memberProfile.findUnique({ where: { id: dto.memberId } });
    const coach = await this.prisma.coachProfile.findUnique({ where: { id: dto.coachId } });

    if (!member || !coach) throw new NotFoundException('Member or coach not found');

    await this.prisma.coachAssignment.updateMany({
      data: { endedAt: new Date(), status: 'ENDED' },
      where: { memberId: dto.memberId, status: 'ACTIVE' },
    });

    const assignment = await this.prisma.coachAssignment.create({
      data: {
        coachId: dto.coachId,
        memberId: dto.memberId,
        notes: dto.notes,
      },
    });

    await this.audit(admin, AuditAction.UPDATE, 'CoachAssignment', assignment.id, { ...dto });
    return assignment;
  }

  async createRegistrationQr(dto: CreateRegistrationQrDto, admin: AuthenticatedUser) {
    const token = randomToken(32);
    const invite = await this.prisma.qrInvite.create({
      data: {
        createdById: admin.id,
        expiresAt: new Date(Date.now() + dto.expiresInDays * 86_400_000),
        purpose: QrInvitePurpose.MEMBER_REGISTRATION,
        tokenHash: hashToken(token),
      },
    });

    return {
      expiresAt: invite.expiresAt,
      id: invite.id,
      token,
      url: `/ar/register?token=${encodeURIComponent(token)}`,
    };
  }

  async observers(query: PaginationDto) {
    const where: Prisma.ShiftObserverWhereInput = {
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' as const } },
              { phone: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status as ObserverStatus } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.shiftObserver.findMany({
        include: {
          _count: { select: { membershipAuditLogs: true } },
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        where,
        ...paginationArgs(query),
      }),
      this.prisma.shiftObserver.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  async receptionFeed() {
    const since = new Date(Date.now() - 15 * 60_000);
    const [registrations, attendances] = await Promise.all([
      this.prisma.memberProfile.findMany({
        include: {
          subscriptions: { include: { plan: true }, orderBy: { endsAt: 'desc' }, take: 1 },
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        where: {
          subscriptions: { none: {} },
          user: { role: UserRole.MEMBER },
        },
      }),
      this.prisma.attendanceRecord.findMany({
        include: {
          member: {
            include: {
              attendanceRecords: { orderBy: { checkedInAt: 'desc' }, take: 2 },
              subscriptions: { include: { plan: true }, orderBy: { endsAt: 'desc' }, take: 1 },
              user: true,
            },
          },
        },
        orderBy: { checkedInAt: 'desc' },
        take: 12,
        where: { checkedInAt: { gte: since } },
      }),
    ]);

    const registrationEvents = registrations.map((member) => ({
      id: `registration:${member.id}`,
      kind: 'REGISTRATION' as const,
      member: {
        age: ageFromDateOfBirth(member.dateOfBirth),
        avatarUrl: member.user.avatarUrl,
        fitnessGoal: member.fitnessGoal,
        gender: member.gender,
        heightCm: member.heightCm,
        id: member.id,
        name: member.user.fullName,
        phone: member.user.phone,
        username: member.user.username,
        weightKg: member.currentWeightKg,
      },
      membership: null,
      occurredAt: member.createdAt,
      previousCheckIn: null,
    }));

    const attendanceEvents = attendances.map((record) => {
      const subscription = record.member.subscriptions[0] ?? null;
      const previousCheckIn =
        record.member.attendanceRecords.find((item) => item.id !== record.id)?.checkedInAt ?? null;
      const remainingDays = subscription
        ? Math.max(0, Math.ceil((subscription.endsAt.getTime() - Date.now()) / 86_400_000))
        : 0;

      return {
        id: `attendance:${record.id}`,
        kind: 'ATTENDANCE' as const,
        member: {
          age: ageFromDateOfBirth(record.member.dateOfBirth),
          avatarUrl: record.member.user.avatarUrl,
          fitnessGoal: record.member.fitnessGoal,
          gender: record.member.gender,
          heightCm: record.member.heightCm,
          id: record.member.id,
          name: record.member.user.fullName,
          phone: record.member.user.phone,
          username: record.member.user.username,
          weightKg: record.member.currentWeightKg,
        },
        membership: {
          plan: subscription?.plan?.nameAr ?? null,
          remainingDays,
          status: subscription?.status ?? 'NONE',
        },
        occurredAt: record.checkedInAt,
        previousCheckIn,
      };
    });

    return [...registrationEvents, ...attendanceEvents]
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 20);
  }

  async createObserver(dto: CreateObserverDto, admin: AuthenticatedUser) {
    const observer = await this.prisma.shiftObserver.create({
      data: {
        fullName: dto.fullName,
        notes: dto.notes,
        phone: dto.phone,
      },
    });

    await this.audit(admin, AuditAction.CREATE, 'ShiftObserver', observer.id, {
      fullName: observer.fullName,
    });

    return observer;
  }

  async updateObserver(id: string, dto: UpdateObserverDto, admin: AuthenticatedUser) {
    const observer = await this.prisma.shiftObserver.update({
      data: dto,
      where: { id },
    });

    await this.audit(admin, AuditAction.UPDATE, 'ShiftObserver', id, { ...dto });
    return observer;
  }

  async setObserverActive(id: string, active: boolean, admin: AuthenticatedUser) {
    const observer = await this.prisma.shiftObserver.update({
      data: { status: active ? ObserverStatus.ACTIVE : ObserverStatus.INACTIVE },
      where: { id },
    });

    await this.audit(admin, AuditAction.UPDATE, 'ShiftObserver', id, { status: observer.status });
    return observer;
  }

  async deleteObserver(id: string, admin: AuthenticatedUser) {
    const observer = await this.prisma.shiftObserver.delete({ where: { id } });

    await this.audit(admin, AuditAction.DELETE, 'ShiftObserver', id, {
      fullName: observer.fullName,
      phone: observer.phone,
    });

    return observer;
  }

  async observerActivity(id: string) {
    const observer = await this.prisma.shiftObserver.findUnique({
      include: {
        membershipAuditLogs: {
          include: {
            admin: { select: { fullName: true, username: true } },
            member: { include: { user: { select: { fullName: true, username: true } } } },
            subscription: { include: { plan: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
      where: { id },
    });

    if (!observer) throw new NotFoundException('Observer not found');

    return observer;
  }

  async notify(dto: AdminNotificationDto, admin: AuthenticatedUser) {
    const target = dto.target ?? 'USER';
    const userIds = await this.resolveNotificationTargets(target, dto.userId);

    if (!userIds.length) {
      throw new BadRequestException('No matching notification recipients');
    }

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        actionUrl: dto.actionUrl,
        bodyAr: dto.bodyAr,
        titleAr: dto.titleAr,
        type: NotificationType.SYSTEM,
        userId,
      })),
    });

    await this.audit(admin, AuditAction.CREATE, 'Notification', admin.id, {
      count: userIds.length,
      target,
      titleAr: dto.titleAr,
    });

    return { count: userIds.length };
  }

  private async resolveNotificationTargets(
    target: NonNullable<AdminNotificationDto['target']>,
    userId?: string,
  ): Promise<string[]> {
    if (target === 'USER') {
      if (!userId) throw new BadRequestException('userId is required for USER target');
      return [userId];
    }

    const now = new Date();
    const memberWhere: Prisma.MemberProfileWhereInput = {
      user: { role: UserRole.MEMBER, status: UserStatus.ACTIVE },
    };

    if (target === 'ACTIVE_MEMBERS') {
      memberWhere.subscriptions = {
        some: { endsAt: { gt: now }, status: { in: ['ACTIVE', 'FROZEN'] } },
      };
    }

    if (target === 'EXPIRED_MEMBERS') {
      memberWhere.subscriptions = {
        some: { OR: [{ endsAt: { lte: now } }, { status: 'EXPIRED' }] },
      };
    }

    if (target === 'PRIVATE_CLIENTS') {
      memberWhere.assignments = { some: { status: 'ACTIVE' } };
    }

    const members = await this.prisma.memberProfile.findMany({
      select: { userId: true },
      where: memberWhere,
      take: 1000,
    });

    return members.map((member) => member.userId);
  }

  private async audit(
    admin: AuthenticatedUser,
    action: AuditAction,
    entityType: string,
    entityId: string,
    metadata: Prisma.InputJsonObject,
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        actorId: admin.id,
        entityId,
        entityType,
        metadata,
      },
    });
  }
}
