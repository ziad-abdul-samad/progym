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
  RegistrationRequestStatus,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { assertSameBranch, requireBranchId } from '../../common/utils/branch.util';
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
import { MembershipsService } from '../memberships/memberships.service';
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
  ReviewRegistrationRequestDto,
} from './dto/admin.dto';

const safeUserSelect = {
  avatarUrl: true,
  createdAt: true,
  email: true,
  fullName: true,
  id: true,
  lastLoginAt: true,
  locale: true,
  phone: true,
  role: true,
  status: true,
  updatedAt: true,
  username: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminService {
  constructor(
    private readonly memberships: MembershipsService,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async branches() {
    return this.prisma.branch.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        addressAr: true,
        code: true,
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
      },
      where: { isActive: true },
    });
  }

  async members(query: PaginationDto, user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
    const where: Prisma.MemberProfileWhereInput = {
      homeBranchId: branchId,
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
            include: { coach: { include: { user: { select: safeUserSelect } } } },
          },
          subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 },
          user: { select: safeUserSelect },
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
    const branchId = requireBranchId(admin);
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
            homeBranchId: branchId,
            memberCode: `PG-${randomToken(5).toUpperCase()}`,
          },
        },
      },
      include: { memberProfile: true },
    });

    await this.audit(admin, AuditAction.CREATE, 'User', user.id, { role: user.role });
    return user;
  }

  async auditLog(query: PaginationDto, user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
    const where: Prisma.AuditLogWhereInput = {
      branchId,
      ...(query.action ? { action: query.action as AuditAction } : {}),
      ...(query.status ? { actor: { role: query.status as UserRole } } : {}),
      ...(query.q
        ? {
            OR: [
              { entityType: { contains: query.q, mode: 'insensitive' } },
              { actor: { fullName: { contains: query.q, mode: 'insensitive' } } },
              { actor: { username: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        include: { actor: { select: { fullName: true, role: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(items, total, query);
  }

  async updateUser(id: string, dto: AdminUpdateUserDto, admin: AuthenticatedUser) {
    await this.assertUserManagementScope(id, admin);
    const user = await this.prisma.user.update({ data: dto, where: { id } });
    await this.audit(admin, AuditAction.UPDATE, 'User', id, { ...dto });
    return user;
  }

  async setUserStatus(id: string, status: UserStatus, admin: AuthenticatedUser) {
    await this.assertUserManagementScope(id, admin);
    const user = await this.prisma.user.update({ data: { status }, where: { id } });
    await this.audit(admin, AuditAction.UPDATE, 'User', id, { status });
    return user;
  }

  async resetPassword(id: string, dto: ResetPasswordByAdminDto, admin: AuthenticatedUser) {
    await this.assertUserManagementScope(id, admin);
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

  async coaches(query: PaginationDto, user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
    const where: Prisma.CoachProfileWhereInput = {
      branches: { some: { branchId } },
      ...(query.q
        ? {
            user: {
              OR: [
                { fullName: { contains: query.q, mode: 'insensitive' as const } },
                { username: { contains: query.q, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.coachProfile.findMany({
        include: {
          _count: { select: { assignments: { where: { branchId } } } },
          assignments: {
            include: {
              member: {
                include: { user: { select: { fullName: true, phone: true, username: true } } },
              },
            },
            orderBy: { startedAt: 'desc' },
            where: { branchId, status: { in: ['ACTIVE', 'PAUSED'] } },
          },
          user: { select: safeUserSelect },
        },
        orderBy: { createdAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.coachProfile.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  async coachSubscriptionEvents(user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
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
      where: { assignment: { branchId } },
    });
  }

  async coachProfileChangeRequests(user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
    return this.prisma.coachProfileChangeRequest.findMany({
      include: {
        coach: { include: { user: { select: safeUserSelect } } },
        reviewer: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      where: { coach: { branches: { some: { branchId } } } },
    });
  }

  async memberProfileChangeRequests(user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
    return this.prisma.memberProfileChangeRequest.findMany({
      include: {
        member: { include: { user: { select: safeUserSelect } } },
        reviewer: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      where: { member: { homeBranchId: branchId } },
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
      include: { member: { include: { user: { select: safeUserSelect } } } },
      where: { id },
    });
    if (!request || request.status !== CoachProfileChangeStatus.PENDING) {
      throw new NotFoundException('طلب تعديل بيانات العضو غير موجود أو تمت مراجعته');
    }
    assertSameBranch(request.member.homeBranchId, admin);

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
          branchId: requireBranchId(admin),
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
      include: { coach: { include: { user: { select: safeUserSelect } } } },
      where: { id },
    });
    if (!request || request.status !== CoachProfileChangeStatus.PENDING) {
      throw new NotFoundException('Pending coach profile change request not found');
    }
    const branchId = requireBranchId(admin);
    const coachBranch = await this.prisma.coachBranch.findUnique({
      where: { coachId_branchId: { branchId, coachId: request.coachId } },
    });
    if (!coachBranch) throw new ForbiddenException('Coach does not belong to this branch');

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
          branchId,
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

    const branches = await this.prisma.branch.findMany({
      select: { id: true },
      where: { isActive: true },
    });
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        passwordHash: await hashPassword(dto.password),
        phone: dto.phone,
        role: UserRole.COACH,
        username,
        coachProfile: {
          create: {
            branches: { create: branches.map(({ id }) => ({ branchId: id })) },
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
    await this.assertUserManagementScope(userId, admin);
    const user = await this.prisma.user.findUnique({
      include: { coachProfile: true },
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');
    const branches = await this.prisma.branch.findMany({
      select: { id: true },
      where: { isActive: true },
    });

    const updated = await this.prisma.user.update({
      data: {
        role: UserRole.COACH,
        coachProfile: user.coachProfile
          ? {
              update: {
                branches: {
                  createMany: {
                    data: branches.map(({ id }) => ({ branchId: id })),
                    skipDuplicates: true,
                  },
                },
              },
            }
          : {
              create: {
                branches: { create: branches.map(({ id }) => ({ branchId: id })) },
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
          branchId: requireBranchId(admin),
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
    const branchId = requireBranchId(admin);
    const member = await this.prisma.memberProfile.findUnique({ where: { id: dto.memberId } });
    const coach = await this.prisma.coachProfile.findFirst({
      where: { branches: { some: { branchId } }, id: dto.coachId },
    });

    if (!member || !coach) throw new NotFoundException('Member or coach not found');
    assertSameBranch(member.homeBranchId, admin);

    await this.prisma.coachAssignment.updateMany({
      data: { endedAt: new Date(), status: 'ENDED' },
      where: { branchId, memberId: dto.memberId, status: 'ACTIVE' },
    });

    const assignment = await this.prisma.coachAssignment.create({
      data: {
        branchId,
        coachId: dto.coachId,
        memberId: dto.memberId,
        notes: dto.notes,
      },
    });

    await this.audit(admin, AuditAction.UPDATE, 'CoachAssignment', assignment.id, { ...dto });
    return assignment;
  }

  async createRegistrationQr(dto: CreateRegistrationQrDto, admin: AuthenticatedUser) {
    const branchId = requireBranchId(admin);
    const token = randomToken(32);
    const invite = await this.prisma.qrInvite.create({
      data: {
        branchId,
        createdById: admin.id,
        expiresAt: new Date(Date.now() + dto.expiresInDays * 86_400_000),
        purpose: QrInvitePurpose.MEMBER_REGISTRATION,
        tokenHash: hashToken(token),
      },
    });
    await this.audit(admin, AuditAction.CREATE, 'QrInvite', invite.id, {
      expiresAt: invite.expiresAt.toISOString(),
      purpose: invite.purpose,
    });

    return {
      expiresAt: invite.expiresAt,
      id: invite.id,
      token,
      url: `/ar/register?token=${encodeURIComponent(token)}`,
    };
  }

  async observers(query: PaginationDto, user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
    const where: Prisma.ShiftObserverWhereInput = {
      branchId,
      deletedAt: null,
      ...(user.role === UserRole.OBSERVER ? { userId: user.id } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' as const } },
              { phone: { contains: query.q, mode: 'insensitive' as const } },
              {
                user: { username: { contains: query.q, mode: 'insensitive' as const } },
              },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status as ObserverStatus } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.shiftObserver.findMany({
        include: {
          _count: { select: { membershipAuditLogs: true } },
          user: { select: { lastLoginAt: true, username: true } },
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        where,
        ...paginationArgs(query),
      }),
      this.prisma.shiftObserver.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  async receptionFeed(user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
    const since = new Date(Date.now() - 15 * 60_000);
    const [registrations, attendances, deniedEntries] = await Promise.all([
      this.prisma.memberProfile.findMany({
        include: {
          homeBranch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
          registrationRequest: true,
          subscriptions: {
            include: {
              branch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
              plan: true,
            },
            orderBy: { endsAt: 'desc' },
            take: 1,
          },
          user: { select: safeUserSelect },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        where: {
          homeBranchId: branchId,
          registrationRequest: { status: RegistrationRequestStatus.PENDING },
          user: { role: UserRole.MEMBER },
        },
      }),
      this.prisma.attendanceRecord.findMany({
        include: {
          member: {
            include: {
              attendanceRecords: { orderBy: { checkedInAt: 'desc' }, take: 2 },
              homeBranch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
              subscriptions: {
                include: {
                  branch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
                  plan: true,
                },
                orderBy: { endsAt: 'desc' },
                take: 1,
              },
              user: { select: safeUserSelect },
            },
          },
        },
        orderBy: { checkedInAt: 'desc' },
        take: 12,
        where: { branchId, checkedInAt: { gte: since } },
      }),
      this.prisma.deniedEntryAttempt.findMany({
        include: {
          branch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
          member: {
            include: {
              homeBranch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
              user: { select: safeUserSelect },
            },
          },
          subscription: {
            include: {
              branch: { select: { code: true, id: true, nameAr: true, nameEn: true } },
              plan: true,
            },
          },
        },
        orderBy: { attemptedAt: 'desc' },
        take: 12,
        where: { attemptedAt: { gte: since }, branchId },
      }),
    ]);

    const registrationEvents = registrations.map((member) => ({
      id: `registration:${member.id}`,
      kind: 'REGISTRATION' as const,
      requestId: member.registrationRequest?.id ?? null,
      member: {
        age: ageFromDateOfBirth(member.dateOfBirth),
        avatarUrl: member.user.avatarUrl,
        fitnessGoal: member.fitnessGoal,
        gender: member.gender,
        heightCm: member.heightCm,
        id: member.id,
        homeBranch: member.homeBranch,
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
          homeBranch: record.member.homeBranch,
          name: record.member.user.fullName,
          phone: record.member.user.phone,
          username: record.member.user.username,
          weightKg: record.member.currentWeightKg,
        },
        membership: {
          plan: subscription?.plan?.nameAr ?? null,
          branch: subscription?.branch ?? null,
          remainingDays,
          status: subscription?.status ?? 'NONE',
        },
        occurredAt: record.checkedInAt,
        previousCheckIn,
      };
    });

    const deniedEntryEvents = deniedEntries.map((attempt) => {
      const subscription = attempt.subscription;
      const remainingDays = subscription
        ? Math.max(0, Math.ceil((subscription.endsAt.getTime() - Date.now()) / 86_400_000))
        : 0;

      return {
        attemptedBranch: attempt.branch,
        denialCode: attempt.denialCode,
        id: `denied-entry:${attempt.id}`,
        kind: 'DENIED_ENTRY' as const,
        member: {
          age: ageFromDateOfBirth(attempt.member.dateOfBirth),
          avatarUrl: attempt.member.user.avatarUrl,
          fitnessGoal: attempt.member.fitnessGoal,
          gender: attempt.member.gender,
          heightCm: attempt.member.heightCm,
          homeBranch: attempt.member.homeBranch,
          id: attempt.member.id,
          name: attempt.member.user.fullName,
          phone: attempt.member.user.phone,
          username: attempt.member.user.username,
          weightKg: attempt.member.currentWeightKg,
        },
        membership: subscription
          ? {
              branch: subscription.branch,
              plan: subscription.plan?.nameAr ?? null,
              remainingDays,
              status: subscription.status,
            }
          : null,
        occurredAt: attempt.attemptedAt,
        previousCheckIn: null,
      };
    });

    return [...registrationEvents, ...attendanceEvents, ...deniedEntryEvents]
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 20);
  }

  async registrationRequests(query: PaginationDto, user: AuthenticatedUser) {
    const branchId = requireBranchId(user);
    const where: Prisma.RegistrationRequestWhereInput = {
      branchId,
      ...(query.status ? { status: query.status as RegistrationRequestStatus } : {}),
      ...(query.q
        ? {
            member: {
              user: {
                OR: [
                  { fullName: { contains: query.q, mode: 'insensitive' } },
                  { username: { contains: query.q, mode: 'insensitive' } },
                  { phone: { contains: query.q, mode: 'insensitive' } },
                ],
              },
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.registrationRequest.findMany({
        include: {
          member: { include: { user: { select: safeUserSelect } } },
          observer: true,
          reviewer: { select: { fullName: true, id: true } },
        },
        orderBy: { createdAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.registrationRequest.count({ where }),
    ]);

    return paginated(items, total, query);
  }

  async reviewRegistrationRequest(
    id: string,
    dto: ReviewRegistrationRequestDto,
    admin: AuthenticatedUser,
  ) {
    const observerId = admin.role === UserRole.OBSERVER ? admin.shiftObserverId : dto.observerId;
    const request = await this.prisma.registrationRequest.findUnique({
      include: { member: { include: { user: { select: safeUserSelect } } } },
      where: { id },
    });
    if (!request) throw new NotFoundException('Registration request not found');
    assertSameBranch(request.branchId, admin);
    if (request.status !== RegistrationRequestStatus.PENDING) {
      throw new ConflictException('Registration request was already reviewed');
    }

    if (!dto.approve) {
      return this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.registrationRequest.update({
          data: {
            reviewReason: dto.reason?.trim() || null,
            reviewedAt: new Date(),
            reviewerId: admin.id,
            observerId: observerId ?? null,
            status: RegistrationRequestStatus.REJECTED,
          },
          where: { id },
        });
        await transaction.auditLog.create({
          data: {
            action: AuditAction.UPDATE,
            actorId: admin.id,
            branchId: request.branchId,
            entityId: id,
            entityType: 'RegistrationRequest',
            metadata: { action: 'REJECT', reason: dto.reason ?? null },
          },
        });
        return updated;
      });
    }

    if (!observerId) {
      throw new BadRequestException('Observer is required to approve a registration');
    }
    const days = dto.days ?? 30;
    const subscription = await this.memberships.createSubscription(
      {
        days,
        memberId: request.memberId,
        observerId,
        reason: dto.reason?.trim() || 'اعتماد طلب تسجيل لاعب جديد',
      },
      admin,
    );

    const updated = await this.prisma.$transaction(async (transaction) => {
      const reviewed = await transaction.registrationRequest.update({
        data: {
          approvedDays: days,
          observerId,
          reviewReason: dto.reason?.trim() || null,
          reviewedAt: new Date(),
          reviewerId: admin.id,
          status: RegistrationRequestStatus.APPROVED,
        },
        where: { id },
      });
      await transaction.user.update({
        data: { status: UserStatus.ACTIVE },
        where: { id: request.member.userId },
      });
      await transaction.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          actorId: admin.id,
          branchId: request.branchId,
          entityId: id,
          entityType: 'RegistrationRequest',
          metadata: { action: 'APPROVE', days, subscriptionId: subscription.id },
        },
      });
      return reviewed;
    });

    return { ...updated, subscription };
  }

  async createObserver(dto: CreateObserverDto, admin: AuthenticatedUser) {
    const branchId = requireBranchId(admin);
    const username = normalizeUsername(dto.username);
    const phone = dto.phone.trim();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { phone }] },
    });
    if (existing) throw new ConflictException('Username or phone already exists');
    const passwordHash = await hashPassword(dto.password);

    const observer = await this.prisma.$transaction(async (transaction) => {
      const account = await transaction.user.create({
        data: {
          fullName: dto.fullName.trim(),
          passwordHash,
          phone,
          role: UserRole.OBSERVER,
          status: UserStatus.ACTIVE,
          username,
        },
      });
      return transaction.shiftObserver.create({
        data: {
          branchId,
          fullName: dto.fullName.trim(),
          notes: dto.notes?.trim() || null,
          phone,
          shiftEnd: dto.shiftEnd,
          shiftStart: dto.shiftStart,
          status: ObserverStatus.ACTIVE,
          userId: account.id,
        },
        include: { user: { select: { lastLoginAt: true, username: true } } },
      });
    });

    await this.audit(admin, AuditAction.CREATE, 'ShiftObserver', observer.id, {
      fullName: observer.fullName,
      shiftEnd: observer.shiftEnd,
      shiftStart: observer.shiftStart,
      username,
    });

    return observer;
  }

  async updateObserver(id: string, dto: UpdateObserverDto, admin: AuthenticatedUser) {
    await this.assertObserverScope(id, admin);
    const target = await this.prisma.shiftObserver.findUnique({
      include: { user: true },
      where: { id },
    });
    if (!target || target.deletedAt) throw new NotFoundException('Observer not found');

    const username = dto.username ? normalizeUsername(dto.username) : undefined;
    if (username || dto.phone) {
      const duplicate = await this.prisma.user.findFirst({
        where: {
          id: { not: target.userId ?? undefined },
          OR: [
            ...(username ? [{ username }] : []),
            ...(dto.phone ? [{ phone: dto.phone.trim() }] : []),
          ],
        },
      });
      if (duplicate) throw new ConflictException('Username or phone already exists');
    }

    const passwordHash = dto.newPassword ? await hashPassword(dto.newPassword) : undefined;
    const observer = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.shiftObserver.update({
        data: {
          ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
          ...(dto.phone ? { phone: dto.phone.trim() } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
          ...(dto.shiftEnd ? { shiftEnd: dto.shiftEnd } : {}),
          ...(dto.shiftStart ? { shiftStart: dto.shiftStart } : {}),
        },
        where: { id },
      });
      if (updated.userId) {
        await transaction.user.update({
          data: {
            ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
            ...(dto.phone ? { phone: dto.phone.trim() } : {}),
            ...(username ? { username } : {}),
            ...(passwordHash ? { passwordHash } : {}),
          },
          where: { id: updated.userId },
        });
      }
      return updated;
    });

    await this.audit(admin, AuditAction.UPDATE, 'ShiftObserver', id, {
      fullName: dto.fullName,
      passwordChanged: Boolean(dto.newPassword),
      phone: dto.phone,
      shiftEnd: dto.shiftEnd,
      shiftStart: dto.shiftStart,
      username,
    });
    return observer;
  }

  async setObserverActive(id: string, active: boolean, admin: AuthenticatedUser) {
    await this.assertObserverScope(id, admin);
    const observer = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.shiftObserver.update({
        data: { status: active ? ObserverStatus.ACTIVE : ObserverStatus.INACTIVE },
        where: { id },
      });
      if (updated.userId) {
        await transaction.user.update({
          data: { status: active ? UserStatus.ACTIVE : UserStatus.INACTIVE },
          where: { id: updated.userId },
        });
      }
      return updated;
    });

    await this.audit(admin, AuditAction.UPDATE, 'ShiftObserver', id, { status: observer.status });
    return observer;
  }

  async deleteObserver(id: string, admin: AuthenticatedUser) {
    const linkedAccount = await this.prisma.shiftObserver.findUnique({
      include: { user: { select: { username: true } } },
      where: { id },
    });
    if (!linkedAccount || linkedAccount.deletedAt) {
      throw new NotFoundException('Observer not found');
    }
    assertSameBranch(linkedAccount.branchId, admin);
    const observer = await this.prisma.$transaction(async (transaction) => {
      const deleted = await transaction.shiftObserver.update({
        data: { deletedAt: new Date(), status: ObserverStatus.INACTIVE, userId: null },
        where: { id },
      });
      if (linkedAccount.userId) {
        await transaction.user.delete({ where: { id: linkedAccount.userId } });
      }
      return deleted;
    });

    await this.audit(admin, AuditAction.DELETE, 'ShiftObserver', id, {
      fullName: observer.fullName,
      phone: observer.phone,
      username: linkedAccount.user?.username ?? null,
    });

    return observer;
  }

  async observerActivity(id: string, user: AuthenticatedUser) {
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

    if (!observer || observer.deletedAt) throw new NotFoundException('Observer not found');
    assertSameBranch(observer.branchId, user);

    return observer;
  }

  async notify(dto: AdminNotificationDto, admin: AuthenticatedUser) {
    const target = dto.target ?? 'USER';
    const userIds = await this.resolveNotificationTargets(
      target,
      requireBranchId(admin),
      dto.userId,
    );

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
    branchId: string,
    userId?: string,
  ): Promise<string[]> {
    if (target === 'USER') {
      if (!userId) throw new BadRequestException('userId is required for USER target');
      const member = await this.prisma.memberProfile.findUnique({
        select: { homeBranchId: true },
        where: { userId },
      });
      if (!member || member.homeBranchId !== branchId) {
        throw new ForbiddenException('Notification recipient is outside this branch');
      }
      return [userId];
    }

    const now = new Date();
    const memberWhere: Prisma.MemberProfileWhereInput = {
      homeBranchId: branchId,
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
        branchId: requireBranchId(admin),
        entityId,
        entityType,
        metadata,
      },
    });
  }

  private async assertUserManagementScope(userId: string, actor: AuthenticatedUser) {
    const branchId = requireBranchId(actor);
    const target = await this.prisma.user.findUnique({
      select: {
        coachProfile: { select: { branches: { select: { branchId: true } } } },
        memberProfile: { select: { homeBranchId: true } },
        role: true,
      },
      where: { id: userId },
    });
    if (!target) throw new NotFoundException('User not found');
    if (actor.role === UserRole.OBSERVER && target.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Observers can only manage player accounts');
    }
    const belongsToBranch =
      target.memberProfile?.homeBranchId === branchId ||
      target.coachProfile?.branches.some((item) => item.branchId === branchId);
    if (!belongsToBranch) throw new ForbiddenException('User does not belong to this branch');
  }

  private async assertObserverScope(observerId: string, actor: AuthenticatedUser) {
    const observer = await this.prisma.shiftObserver.findUnique({
      select: { branchId: true, deletedAt: true },
      where: { id: observerId },
    });
    if (!observer || observer.deletedAt) throw new NotFoundException('Observer not found');
    assertSameBranch(observer.branchId, actor);
  }
}
