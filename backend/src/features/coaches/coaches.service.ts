import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentStatus,
  CoachPlanRequirement,
  CoachSubscriptionAction,
  CoachRequestStatus,
  NotificationType,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import type { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ageFromDateOfBirth } from '../../common/utils/age.util';
import { paginated, paginationArgs } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  CreateCoachRequestDto,
  CoachProfileChangeDto,
  CreateNutritionPlanDto,
  CreateWorkoutPlanDto,
  ManageCoachSubscriptionDto,
} from './dto/coaches.dto';

const DAY_MS = 86_400_000;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function coachingSummary(assignment: {
  coachingEndsAt: Date | null;
  coachingStartsAt: Date | null;
  pausedAt: Date | null;
  planRequirement: CoachPlanRequirement;
  reminderEnabled: boolean;
  status: AssignmentStatus;
}) {
  const effectiveNow =
    assignment.status === AssignmentStatus.PAUSED && assignment.pausedAt
      ? assignment.pausedAt
      : new Date();
  const remainingDays = assignment.coachingEndsAt
    ? Math.max(
        0,
        Math.ceil((assignment.coachingEndsAt.getTime() - effectiveNow.getTime()) / DAY_MS),
      )
    : 0;
  return {
    canResume: assignment.status === AssignmentStatus.PAUSED && Boolean(assignment.pausedAt),
    endsAt: assignment.coachingEndsAt,
    isActive: assignment.status === AssignmentStatus.ACTIVE && remainingDays > 0,
    planRequirement: assignment.planRequirement,
    remainingDays,
    reminderEnabled: assignment.reminderEnabled,
    startsAt: assignment.coachingStartsAt,
    status: assignment.status,
  };
}

function coachingHistorySummary(
  events: Array<{
    action: CoachSubscriptionAction;
    createdAt: Date;
    days: number | null;
    id: string;
    newEndsAt: Date | null;
    previousEndsAt: Date | null;
  }>,
) {
  const ordered = events.slice().sort((first, second) => {
    return second.createdAt.getTime() - first.createdAt.getTime();
  });
  const starts = ordered.filter((event) => event.action === CoachSubscriptionAction.STARTED);
  const renewals = ordered.filter((event) => event.action === CoachSubscriptionAction.RENEWED);

  return {
    events: ordered,
    firstSubscriptionAt: starts.at(-1)?.createdAt ?? null,
    lastActivityAt: ordered[0]?.createdAt ?? null,
    renewalCount: renewals.length,
    subscriptionCount: starts.length,
    totalDays: ordered.reduce((total, event) => total + (event.days ?? 0), 0),
  };
}

@Injectable()
export class CoachesService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  async dashboard(user: AuthenticatedUser) {
    const coachId = this.requireCoach(user);
    await this.expireOverdueAssignments(coachId);
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
    const assignments = await this.prisma.coachAssignment.findMany({
      include: {
        coach: { include: { user: true } },
        member: {
          include: {
            attendanceRecords: {
              orderBy: { checkedInAt: 'desc' },
              where: { checkedInAt: { gte: monthAgo } },
            },
            progressEntries: { orderBy: { measuredAt: 'desc' }, take: 2 },
            subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 },
            user: true,
          },
        },
      },
      where: { coachId, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    const [activeWorkoutPlans, activeNutritionPlans, pendingRequests] = await Promise.all([
      this.prisma.workoutPlan.count({ where: { coachId, status: 'ACTIVE' } }),
      this.prisma.nutritionPlan.count({ where: { coachId, status: 'ACTIVE' } }),
      this.prisma.coachRequest.count({ where: { coachId, status: 'PENDING' } }),
    ]);

    const dayKeys = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - offset));
      return date.toISOString().slice(0, 10);
    });
    const attendanceByDay = new Map(dayKeys.map((key) => [key, 0]));

    for (const assignment of assignments) {
      for (const attendance of assignment.member.attendanceRecords) {
        const key = attendance.checkedInAt.toISOString().slice(0, 10);
        if (attendanceByDay.has(key)) {
          attendanceByDay.set(key, (attendanceByDay.get(key) ?? 0) + 1);
        }
      }
    }

    await this.ensureExpiryReminders(assignments);

    const clients = assignments.map((assignment) => {
      const { member } = assignment;
      const latest = member.progressEntries[0];
      const previous = member.progressEntries[1];
      return {
        attendanceCount: member.attendanceRecords.length,
        avatarUrl: member.user.avatarUrl,
        goal: member.fitnessGoal,
        id: member.id,
        name: member.user.fullName,
        coaching: coachingSummary(assignment),
        subscriptionStatus: member.subscriptions[0]?.status ?? 'NONE',
        weight: Number(latest?.weightKg ?? member.currentWeightKg),
        weightChange:
          latest?.weightKg && previous?.weightKg
            ? Number(latest.weightKg) - Number(previous.weightKg)
            : 0,
      };
    });

    return {
      attendanceTrend: dayKeys.map((date) => ({
        count: attendanceByDay.get(date) ?? 0,
        date,
      })),
      clientPulse: clients
        .slice()
        .sort((first, second) => second.attendanceCount - first.attendanceCount)
        .slice(0, 8),
      clients,
      metrics: {
        activeNutritionPlans,
        activeWorkoutPlans,
        pendingRequests,
        activeCoachingSubscriptions: assignments.filter(
          (assignment) => assignment.status === AssignmentStatus.ACTIVE,
        ).length,
        totalClients: assignments.length,
      },
    };
  }

  async account(user: AuthenticatedUser) {
    const coachId = this.requireCoach(user);
    return this.prisma.coachProfile.findUniqueOrThrow({
      include: {
        changeRequests: { orderBy: { createdAt: 'desc' }, take: 20 },
        user: {
          select: {
            avatarUrl: true,
            email: true,
            fullName: true,
            phone: true,
            username: true,
          },
        },
      },
      where: { id: coachId },
    });
  }

  async requestAccountChange(user: AuthenticatedUser, dto: CoachProfileChangeDto) {
    const coachId = this.requireCoach(user);
    const requestedData = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => typeof value === 'string' && value.trim()),
    );

    if (!Object.keys(requestedData).length) {
      throw new BadRequestException('At least one profile change is required');
    }

    const pending = await this.prisma.coachProfileChangeRequest.findFirst({
      where: { coachId, status: 'PENDING' },
    });
    if (pending) {
      throw new ConflictException('A profile change request is already pending');
    }

    return this.prisma.coachProfileChangeRequest.create({
      data: { coachId, requestedData },
    });
  }

  async cancelAccountChange(user: AuthenticatedUser, id: string) {
    const coachId = this.requireCoach(user);
    const request = await this.prisma.coachProfileChangeRequest.findFirst({
      where: { coachId, id, status: 'PENDING' },
    });
    if (!request) throw new NotFoundException('Pending profile change request not found');

    return this.prisma.coachProfileChangeRequest.delete({ where: { id } });
  }

  async assignedClients(user: AuthenticatedUser, query: PaginationDto) {
    const coachId = this.requireCoach(user);
    await this.expireOverdueAssignments(coachId);
    const where: Prisma.CoachAssignmentWhereInput = {
      coachId,
      member: query.q
        ? {
            user: {
              OR: [
                { fullName: { contains: query.q, mode: 'insensitive' as const } },
                { username: { contains: query.q, mode: 'insensitive' as const } },
                { phone: { contains: query.q, mode: 'insensitive' as const } },
              ],
            },
          }
        : undefined,
      status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.PAUSED] },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.coachAssignment.findMany({
        include: {
          coach: { include: { user: true } },
          member: {
            include: {
              attendanceRecords: { orderBy: { checkedInAt: 'desc' }, take: 1 },
              progressEntries: { orderBy: { measuredAt: 'desc' }, take: 1 },
              subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 },
              user: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.coachAssignment.count({ where }),
    ]);

    await this.ensureExpiryReminders(items);
    return paginated(
      items.map((assignment) => ({
        ...assignment,
        coaching: coachingSummary(assignment),
      })),
      total,
      query,
    );
  }

  async subscriptionArchive(user: AuthenticatedUser, query: PaginationDto) {
    const coachId = this.requireCoach(user);
    await this.expireOverdueAssignments(coachId);
    const where: Prisma.MemberProfileWhereInput = {
      assignments: { some: { coachId } },
      ...(query.q
        ? {
            OR: [
              { memberCode: { contains: query.q, mode: 'insensitive' as const } },
              { user: { fullName: { contains: query.q, mode: 'insensitive' as const } } },
              { user: { username: { contains: query.q, mode: 'insensitive' as const } } },
              { user: { phone: { contains: query.q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [members, total] = await this.prisma.$transaction([
      this.prisma.memberProfile.findMany({
        include: {
          assignments: {
            include: { subscriptionEvents: { orderBy: { createdAt: 'desc' } } },
            orderBy: { startedAt: 'desc' },
            where: { coachId },
          },
          user: true,
        },
        orderBy: { joinedAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.memberProfile.count({ where }),
    ]);

    return paginated(
      members.map((member) => {
        const events = member.assignments.flatMap((assignment) => {
          return assignment.subscriptionEvents;
        });
        const currentAssignment = member.assignments.find(
          (assignment) =>
            assignment.status === AssignmentStatus.ACTIVE ||
            assignment.status === AssignmentStatus.PAUSED,
        );

        return {
          currentCoaching: currentAssignment ? coachingSummary(currentAssignment) : null,
          fitnessGoal: member.fitnessGoal,
          id: member.id,
          memberCode: member.memberCode,
          subscriptionHistory: coachingHistorySummary(events),
          user: {
            avatarUrl: member.user.avatarUrl,
            fullName: member.user.fullName,
            phone: member.user.phone,
            username: member.user.username,
          },
        };
      }),
      total,
      query,
    );
  }

  async availableMembers(user: AuthenticatedUser, query: PaginationDto) {
    this.requireCoach(user);
    if (!query.q?.trim() || query.q.trim().length < 2) {
      return paginated([], 0, query);
    }

    const where: Prisma.MemberProfileWhereInput = {
      assignments: {
        none: { status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.PAUSED] } },
      },
      user: {
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
      },
      OR: [
        { memberCode: { contains: query.q, mode: 'insensitive' } },
        { user: { fullName: { contains: query.q, mode: 'insensitive' } } },
        { user: { username: { contains: query.q, mode: 'insensitive' } } },
        { user: { phone: { contains: query.q, mode: 'insensitive' } } },
      ],
    };

    const [members, total] = await this.prisma.$transaction([
      this.prisma.memberProfile.findMany({
        include: { user: true },
        orderBy: { joinedAt: 'desc' },
        where,
        ...paginationArgs(query),
      }),
      this.prisma.memberProfile.count({ where }),
    ]);

    return paginated(
      members.map((member) => ({
        currentWeightKg: member.currentWeightKg,
        fitnessGoal: member.fitnessGoal,
        id: member.id,
        memberCode: member.memberCode,
        user: {
          fullName: member.user.fullName,
          maskedPhone: `***${member.user.phone.slice(-4)}`,
          username: member.user.username,
        },
      })),
      total,
      query,
    );
  }

  async addClient(user: AuthenticatedUser, memberId: string) {
    const coachId = this.requireCoach(user);
    const member = await this.prisma.memberProfile.findUnique({
      include: { user: true },
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');
    const existing = await this.prisma.coachAssignment.findFirst({
      where: {
        memberId,
        status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.PAUSED] },
      },
    });
    if (existing) throw new ConflictException('Member is already assigned to a coach');

    const assignment = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.coachAssignment.create({
        data: { coachId, memberId, status: AssignmentStatus.PAUSED },
      });
      await transaction.coachSubscriptionEvent.create({
        data: {
          action: CoachSubscriptionAction.ADDED,
          assignmentId: created.id,
          coachId,
          memberId,
        },
      });
      return created;
    });

    await this.notifications.create({
      actionUrl: '/ar/dashboard/member',
      bodyAr:
        'أصبحت ضمن فريق مدربك الخاص. خطتك قيد التجهيز الآن، وسنخبرك فور وصول برنامج التدريب أو خطة الغذاء.',
      metadata: { assignmentId: assignment.id },
      titleAr: 'رحلتك الخاصة بدأت بشكل جميل',
      type: NotificationType.COACHING,
      userId: member.userId,
    });

    return { ...assignment, coaching: coachingSummary(assignment) };
  }

  async startClientSubscription(
    user: AuthenticatedUser,
    memberId: string,
    dto: ManageCoachSubscriptionDto,
  ) {
    const assignment = await this.getManagedAssignment(user, memberId);
    if (assignment.status === AssignmentStatus.ACTIVE) {
      throw new ConflictException('Private coaching is already active; use renew instead');
    }
    if (assignment.pausedAt) {
      throw new ConflictException('Private coaching is paused; use resume instead');
    }
    await this.assertPlanRequirement(assignment.coachId, memberId, dto.planRequirement);
    const now = new Date();
    const endsAt = addDays(now, dto.days);
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.coachAssignment.update({
        data: {
          coachingEndsAt: endsAt,
          coachingStartsAt: now,
          pausedAt: null,
          planRequirement: dto.planRequirement,
          reminderEnabled: dto.reminderEnabled ?? true,
          status: AssignmentStatus.ACTIVE,
        },
        where: { id: assignment.id },
      });
      await transaction.coachSubscriptionEvent.create({
        data: {
          action: CoachSubscriptionAction.STARTED,
          assignmentId: assignment.id,
          coachId: assignment.coachId,
          days: dto.days,
          memberId,
          newEndsAt: endsAt,
          previousEndsAt: assignment.coachingEndsAt,
        },
      });
      return result;
    });
    await this.notifyCoachingActivated(memberId, dto.days, false);
    return { ...updated, coaching: coachingSummary(updated) };
  }

  async renewClientSubscription(
    user: AuthenticatedUser,
    memberId: string,
    dto: ManageCoachSubscriptionDto,
  ) {
    const assignment = await this.getManagedAssignment(user, memberId);
    if (assignment.status !== AssignmentStatus.ACTIVE) {
      throw new ConflictException('Start private coaching before renewing it');
    }
    await this.assertPlanRequirement(assignment.coachId, memberId, dto.planRequirement);
    const now = new Date();
    const base =
      assignment.coachingEndsAt && assignment.coachingEndsAt > now
        ? assignment.coachingEndsAt
        : now;
    const endsAt = addDays(base, dto.days);
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.coachAssignment.update({
        data: {
          coachingEndsAt: endsAt,
          coachingStartsAt: assignment.coachingStartsAt ?? now,
          planRequirement: dto.planRequirement,
          reminderEnabled: dto.reminderEnabled ?? true,
          status: AssignmentStatus.ACTIVE,
        },
        where: { id: assignment.id },
      });
      await transaction.coachSubscriptionEvent.create({
        data: {
          action: CoachSubscriptionAction.RENEWED,
          assignmentId: assignment.id,
          coachId: assignment.coachId,
          days: dto.days,
          memberId,
          newEndsAt: endsAt,
          previousEndsAt: assignment.coachingEndsAt,
        },
      });
      return result;
    });
    await this.notifyCoachingActivated(memberId, dto.days, true);
    return { ...updated, coaching: coachingSummary(updated) };
  }

  async deactivateClient(user: AuthenticatedUser, memberId: string) {
    const assignment = await this.getManagedAssignment(user, memberId);
    if (assignment.status === AssignmentStatus.PAUSED) {
      return { ...assignment, coaching: coachingSummary(assignment) };
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.coachAssignment.update({
        data: { pausedAt: new Date(), status: AssignmentStatus.PAUSED },
        where: { id: assignment.id },
      });
      await transaction.coachSubscriptionEvent.create({
        data: {
          action: CoachSubscriptionAction.DEACTIVATED,
          assignmentId: assignment.id,
          coachId: assignment.coachId,
          memberId,
          previousEndsAt: assignment.coachingEndsAt,
        },
      });
      return result;
    });
    await this.notifyMember(memberId, {
      actionUrl: '/ar/dashboard/member',
      bodyAr:
        'تم إيقاف التدريب الخاص مؤقتاً. ما زال حسابك العادي واشتراك النادي يعملان بشكل طبيعي.',
      titleAr: 'تم إيقاف التدريب الخاص',
      type: NotificationType.COACHING,
    });
    return { ...updated, coaching: coachingSummary(updated) };
  }

  async resumeClientSubscription(user: AuthenticatedUser, memberId: string) {
    const assignment = await this.getManagedAssignment(user, memberId);
    if (assignment.status !== AssignmentStatus.PAUSED || !assignment.pausedAt) {
      throw new ConflictException('Private coaching is not temporarily paused');
    }
    const remainingMs = Math.max(
      0,
      (assignment.coachingEndsAt?.getTime() ?? assignment.pausedAt.getTime()) -
        assignment.pausedAt.getTime(),
    );
    if (remainingMs <= 0) {
      throw new ConflictException('Private coaching has no remaining time; start a new period');
    }
    const endsAt = new Date(Date.now() + remainingMs);
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.coachAssignment.update({
        data: {
          coachingEndsAt: endsAt,
          pausedAt: null,
          status: AssignmentStatus.ACTIVE,
        },
        where: { id: assignment.id },
      });
      await transaction.coachSubscriptionEvent.create({
        data: {
          action: CoachSubscriptionAction.RESUMED,
          assignmentId: assignment.id,
          coachId: assignment.coachId,
          memberId,
          newEndsAt: endsAt,
          previousEndsAt: assignment.coachingEndsAt,
        },
      });
      return result;
    });
    await this.notifyMember(memberId, {
      actionUrl: '/ar/dashboard/member',
      bodyAr: 'تم استئناف تدريبك الخاص مع الاحتفاظ بكامل المدة المتبقية.',
      titleAr: 'تم استئناف التدريب الخاص',
      type: NotificationType.COACHING,
    });
    return { ...updated, coaching: coachingSummary(updated) };
  }

  async endClientRelationship(user: AuthenticatedUser, memberId: string) {
    const assignment = await this.getManagedAssignment(user, memberId);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.coachAssignment.update({
        data: { endedAt: now, pausedAt: null, status: AssignmentStatus.ENDED },
        where: { id: assignment.id },
      });
      await transaction.coachSubscriptionEvent.create({
        data: {
          action: CoachSubscriptionAction.ENDED,
          assignmentId: assignment.id,
          coachId: assignment.coachId,
          memberId,
          previousEndsAt: assignment.coachingEndsAt,
        },
      });
      return result;
    });
    await this.notifyMember(memberId, {
      actionUrl: '/ar/dashboard/member',
      bodyAr: 'تم إنهاء العلاقة مع المدرب. حساب النادي وسجل الحضور والاشتراك لم تتأثر.',
      titleAr: 'تم إنهاء العلاقة مع المدرب',
      type: NotificationType.COACHING,
    });
    return { ...updated, coaching: coachingSummary(updated) };
  }

  async clientDetail(user: AuthenticatedUser, memberId: string) {
    const assignment = await this.getManagedAssignment(user, memberId);

    const [member, events] = await Promise.all([
      this.prisma.memberProfile.findUniqueOrThrow({
        include: {
          attendanceRecords: { orderBy: { checkedInAt: 'desc' }, take: 100 },
          progressEntries: { orderBy: { measuredAt: 'asc' } },
          progressPhotos: { include: { fileAsset: true }, orderBy: { createdAt: 'desc' } },
          subscriptions: { include: { plan: true }, orderBy: { endsAt: 'desc' }, take: 3 },
          user: true,
          workoutPlans: {
            include: { items: { include: { exercise: true } } },
            orderBy: { updatedAt: 'desc' },
          },
          nutritionPlans: {
            include: { meals: { include: { items: true } } },
            orderBy: { updatedAt: 'desc' },
          },
        },
        where: { id: memberId },
      }),
      this.prisma.coachSubscriptionEvent.findMany({
        orderBy: { createdAt: 'desc' },
        where: { coachId: assignment.coachId, memberId },
      }),
    ]);
    return {
      ...member,
      age: ageFromDateOfBirth(member.dateOfBirth),
      coaching: coachingSummary(assignment),
      nutritionPlans: member.nutritionPlans.filter((plan) => plan.status === 'ACTIVE'),
      planArchive: {
        nutrition: member.nutritionPlans.filter((plan) => plan.status === 'ARCHIVED'),
        workouts: member.workoutPlans.filter((plan) => plan.status === 'ARCHIVED'),
      },
      subscriptionHistory: coachingHistorySummary(events),
      workoutPlans: member.workoutPlans.filter((plan) => plan.status === 'ACTIVE'),
    };
  }

  async createWorkoutPlan(user: AuthenticatedUser, dto: CreateWorkoutPlanDto) {
    const coachId = await this.assertAssigned(user, dto.memberId);
    const plan = await this.prisma.workoutPlan.create({
      data: {
        coachId,
        memberId: dto.memberId,
        notes: dto.notes,
        seriesId: randomUUID(),
        status: dto.status ?? 'ACTIVE',
        title: dto.title,
        items: {
          create: dto.items.map((item, index) => ({
            dayIndex: item.dayIndex,
            dayTitle: item.dayTitle,
            exerciseId: item.exerciseId,
            exerciseName: item.exerciseName,
            notes: item.notes,
            reps: item.reps,
            sets: item.sets,
            sortOrder: index,
            videoUrl: item.videoUrl,
          })),
        },
      },
    });

    await this.notifyMember(dto.memberId, {
      actionUrl: '/ar/dashboard/member/workouts',
      bodyAr: 'قام المدرب بتحديث خطة التمرين الخاصة بك',
      titleAr: 'خطة تمرين جديدة',
      type: NotificationType.COACHING,
    });

    return plan;
  }

  async updateWorkoutPlan(user: AuthenticatedUser, id: string, dto: CreateWorkoutPlanDto) {
    const coachId = await this.assertAssigned(user, dto.memberId);
    const current = await this.assertWorkoutPlanOwner(id, coachId, dto.memberId);

    const plan = await this.prisma.$transaction(async (transaction) => {
      await transaction.workoutPlan.update({
        data: { status: 'ARCHIVED' },
        where: { id },
      });
      return transaction.workoutPlan.create({
        data: {
          coachId,
          memberId: dto.memberId,
          notes: dto.notes,
          seriesId: current.seriesId,
          status: dto.status ?? 'ACTIVE',
          title: dto.title,
          version: current.version + 1,
          items: {
            create: dto.items.map((item, index) => ({
              dayIndex: item.dayIndex,
              dayTitle: item.dayTitle,
              exerciseId: item.exerciseId,
              exerciseName: item.exerciseName,
              notes: item.notes,
              reps: item.reps,
              sets: item.sets,
              sortOrder: index,
              videoUrl: item.videoUrl,
            })),
          },
        },
        include: { items: { orderBy: [{ dayIndex: 'asc' }, { sortOrder: 'asc' }] } },
      });
    });

    await this.notifyPlanUpdated(dto.memberId, 'workout');
    return plan;
  }

  async deleteWorkoutPlan(user: AuthenticatedUser, id: string) {
    const coachId = this.requireCoach(user);
    const plan = await this.prisma.workoutPlan.findUnique({ where: { id } });
    if (!plan || plan.coachId !== coachId) throw new NotFoundException('Workout plan not found');
    if (plan.status === 'ARCHIVED') {
      throw new ConflictException('Archived workout plan versions are read-only');
    }
    await this.assertAssigned(user, plan.memberId);
    return this.prisma.workoutPlan.update({
      data: { status: 'ARCHIVED' },
      where: { id },
    });
  }

  async createNutritionPlan(user: AuthenticatedUser, dto: CreateNutritionPlanDto) {
    const coachId = await this.assertAssigned(user, dto.memberId);
    const plan = await this.prisma.nutritionPlan.create({
      data: {
        coachId,
        memberId: dto.memberId,
        notes: dto.notes,
        seriesId: randomUUID(),
        status: dto.status ?? 'ACTIVE',
        targetCalories: dto.targetCalories,
        targetCarbsG: dto.targetCarbsG,
        targetFatG: dto.targetFatG,
        targetMode: dto.targetMode,
        targetProteinG: dto.targetProteinG,
        title: dto.title,
        meals: {
          create: dto.meals.map((meal, mealIndex) => ({
            name: meal.name,
            notes: meal.notes,
            sortOrder: mealIndex,
            timing: meal.timing,
            items: {
              create: meal.items.map((item, itemIndex) => ({
                calories: item.calories,
                carbsG: item.carbsG,
                fatG: item.fatG,
                name: item.name,
                proteinG: item.proteinG,
                quantity: item.quantity,
                sortOrder: itemIndex,
              })),
            },
          })),
        },
      },
    });

    await this.notifyMember(dto.memberId, {
      actionUrl: '/ar/dashboard/member/nutrition',
      bodyAr: 'قام المدرب بتحديث خطة التغذية الخاصة بك',
      titleAr: 'خطة تغذية جديدة',
      type: NotificationType.COACHING,
    });

    return plan;
  }

  async updateNutritionPlan(user: AuthenticatedUser, id: string, dto: CreateNutritionPlanDto) {
    const coachId = await this.assertAssigned(user, dto.memberId);
    const current = await this.assertNutritionPlanOwner(id, coachId, dto.memberId);

    const plan = await this.prisma.$transaction(async (transaction) => {
      await transaction.nutritionPlan.update({
        data: { status: 'ARCHIVED' },
        where: { id },
      });
      return transaction.nutritionPlan.create({
        data: {
          coachId,
          memberId: dto.memberId,
          notes: dto.notes,
          seriesId: current.seriesId,
          status: dto.status ?? 'ACTIVE',
          targetCalories: dto.targetCalories,
          targetCarbsG: dto.targetCarbsG,
          targetFatG: dto.targetFatG,
          targetMode: dto.targetMode,
          targetProteinG: dto.targetProteinG,
          title: dto.title,
          version: current.version + 1,
          meals: {
            create: dto.meals.map((meal, mealIndex) => ({
              name: meal.name,
              notes: meal.notes,
              sortOrder: mealIndex,
              timing: meal.timing,
              items: {
                create: meal.items.map((item, itemIndex) => ({
                  calories: item.calories,
                  carbsG: item.carbsG,
                  fatG: item.fatG,
                  name: item.name,
                  proteinG: item.proteinG,
                  quantity: item.quantity,
                  sortOrder: itemIndex,
                })),
              },
            })),
          },
        },
        include: {
          meals: {
            include: { items: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    await this.notifyPlanUpdated(dto.memberId, 'nutrition');
    return plan;
  }

  async deleteNutritionPlan(user: AuthenticatedUser, id: string) {
    const coachId = this.requireCoach(user);
    const plan = await this.prisma.nutritionPlan.findUnique({ where: { id } });
    if (!plan || plan.coachId !== coachId) {
      throw new NotFoundException('Nutrition plan not found');
    }
    if (plan.status === 'ARCHIVED') {
      throw new ConflictException('Archived nutrition plan versions are read-only');
    }
    await this.assertAssigned(user, plan.memberId);
    return this.prisma.nutritionPlan.update({
      data: { status: 'ARCHIVED' },
      where: { id },
    });
  }

  async createRequest(user: AuthenticatedUser, dto: CreateCoachRequestDto) {
    const coachId = await this.assertAssigned(user, dto.memberId);
    if (dto.type === 'NEW_PHOTOS') {
      const existing = await this.prisma.coachRequest.findFirst({
        where: {
          coachId,
          memberId: dto.memberId,
          status: CoachRequestStatus.PENDING,
          type: 'NEW_PHOTOS',
        },
      });
      if (existing) {
        throw new ConflictException('A progress-photo request is already pending');
      }
    }
    const request = await this.prisma.coachRequest.create({
      data: {
        coachId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        memberId: dto.memberId,
        message: dto.message,
        type: dto.type,
      },
    });

    await this.notifyMember(dto.memberId, {
      actionUrl: '/ar/dashboard/member/requests',
      bodyAr: dto.message ?? 'لديك طلب متابعة جديد من المدرب',
      titleAr: 'طلب جديد من المدرب',
      type: NotificationType.COACHING,
    });

    return request;
  }

  async completeRequest(user: AuthenticatedUser, id: string) {
    const request = await this.prisma.coachRequest.findUnique({ where: { id } });

    if (!request) throw new NotFoundException('Request not found');
    await this.assertAssigned(user, request.memberId);
    if (request.type === 'NEW_PHOTOS') {
      throw new BadRequestException('Photo requests complete only after all required angles upload');
    }

    return this.prisma.coachRequest.update({
      data: { completedAt: new Date(), status: CoachRequestStatus.COMPLETED },
      where: { id },
    });
  }

  private requireCoach(user: AuthenticatedUser): string {
    if (user.role !== UserRole.COACH || !user.coachProfileId) {
      throw new ForbiddenException('Coach profile is required');
    }

    return user.coachProfileId;
  }

  private async assertAssigned(user: AuthenticatedUser, memberId: string): Promise<string> {
    return (await this.getManagedAssignment(user, memberId)).coachId;
  }

  private async getManagedAssignment(user: AuthenticatedUser, memberId: string) {
    const coachId = this.requireCoach(user);
    const assignment = await this.prisma.coachAssignment.findFirst({
      include: {
        coach: { include: { user: true } },
        member: { include: { user: true } },
      },
      where: {
        coachId,
        memberId,
        status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.PAUSED] },
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Client is not assigned to this coach');
    }

    return assignment;
  }

  private async assertPlanRequirement(
    coachId: string,
    memberId: string,
    requirement: CoachPlanRequirement,
  ) {
    const [workoutPlans, nutritionPlans] = await Promise.all([
      this.prisma.workoutPlan.count({
        where: { coachId, memberId, status: 'ACTIVE' },
      }),
      this.prisma.nutritionPlan.count({
        where: { coachId, memberId, status: 'ACTIVE' },
      }),
    ]);
    const hasWorkout = workoutPlans > 0;
    const hasNutrition = nutritionPlans > 0;
    const isReady =
      (requirement === CoachPlanRequirement.EITHER && (hasWorkout || hasNutrition)) ||
      (requirement === CoachPlanRequirement.WORKOUT && hasWorkout) ||
      (requirement === CoachPlanRequirement.NUTRITION && hasNutrition) ||
      (requirement === CoachPlanRequirement.BOTH && hasWorkout && hasNutrition);

    if (!isReady) {
      throw new BadRequestException('أنشئ الخطة التي اخترتها أولاً قبل بدء اشتراك التدريب الخاص.');
    }
  }

  private async expireOverdueAssignments(coachId?: string) {
    const assignments = await this.prisma.coachAssignment.findMany({
      include: {
        coach: { include: { user: true } },
        member: { include: { user: true } },
      },
      where: {
        coachingEndsAt: { lte: new Date() },
        status: AssignmentStatus.ACTIVE,
        ...(coachId ? { coachId } : {}),
      },
    });

    for (const assignment of assignments) {
      const expired = await this.prisma.$transaction(async (transaction) => {
        const update = await transaction.coachAssignment.updateMany({
          data: { pausedAt: null, status: AssignmentStatus.PAUSED },
          where: { id: assignment.id, status: AssignmentStatus.ACTIVE },
        });
        if (!update.count) return false;
        await transaction.coachSubscriptionEvent.create({
          data: {
            action: CoachSubscriptionAction.EXPIRED,
            assignmentId: assignment.id,
            coachId: assignment.coachId,
            memberId: assignment.memberId,
            previousEndsAt: assignment.coachingEndsAt,
          },
        });
        return true;
      });
      if (!expired) continue;

      await this.notifications.create({
        actionUrl: '/ar/dashboard/member',
        bodyAr:
          'انتهت مدة التدريب الخاص، لكن حسابك وعضوية النادي ما زالا يعملان كالمعتاد. تواصل مع مدربك عندما تريد التجديد.',
        metadata: { assignmentId: assignment.id },
        titleAr: 'انتهى اشتراك التدريب الخاص',
        type: NotificationType.COACHING,
        userId: assignment.member.userId,
      });
    }
  }

  private async ensureExpiryReminders(
    assignments: Array<{
      coachingEndsAt: Date | null;
      coach: { user: { fullName: string; id: string } };
      id: string;
      member: { user: { fullName: string; id: string } };
      reminderEnabled: boolean;
      status: AssignmentStatus;
    }>,
  ) {
    for (const assignment of assignments) {
      if (
        assignment.status !== AssignmentStatus.ACTIVE ||
        !assignment.reminderEnabled ||
        !assignment.coachingEndsAt
      ) {
        continue;
      }
      const remainingDays = Math.max(
        0,
        Math.ceil((assignment.coachingEndsAt.getTime() - Date.now()) / DAY_MS),
      );
      if (remainingDays < 1 || remainingDays > 5) continue;

      await this.notifications.ensureCoachSubscriptionExpiryReminder({
        assignmentId: assignment.id,
        coachName: assignment.coach.user.fullName,
        coachUserId: assignment.coach.user.id,
        endsAt: assignment.coachingEndsAt,
        memberName: assignment.member.user.fullName,
        memberUserId: assignment.member.user.id,
        remainingDays,
      });
    }
  }

  private async notifyCoachingActivated(memberId: string, days: number, renewed: boolean) {
    await this.notifyMember(memberId, {
      actionUrl: '/ar/dashboard/member',
      bodyAr: renewed
        ? `تمت إضافة ${days} يوم إلى تدريبك الخاص. استمر بقوة، وخططك جاهزة معك.`
        : `تم تفعيل تدريبك الخاص لمدة ${days} يوم. خططك أصبحت جاهزة، وهذه بداية جديدة نحو هدفك.`,
      titleAr: renewed ? 'تم تجديد التدريب الخاص' : 'بدأ اشتراكك مع المدرب',
      type: NotificationType.COACHING,
    });
  }

  private async assertWorkoutPlanOwner(id: string, coachId: string, memberId: string) {
    const plan = await this.prisma.workoutPlan.findUnique({ where: { id } });
    if (!plan || plan.coachId !== coachId || plan.memberId !== memberId) {
      throw new NotFoundException('Workout plan not found');
    }
    if (plan.status === 'ARCHIVED') {
      throw new ConflictException('Archived workout plan versions are read-only');
    }
    return plan;
  }

  private async assertNutritionPlanOwner(id: string, coachId: string, memberId: string) {
    const plan = await this.prisma.nutritionPlan.findUnique({ where: { id } });
    if (!plan || plan.coachId !== coachId || plan.memberId !== memberId) {
      throw new NotFoundException('Nutrition plan not found');
    }
    if (plan.status === 'ARCHIVED') {
      throw new ConflictException('Archived nutrition plan versions are read-only');
    }
    return plan;
  }

  private async notifyPlanUpdated(memberId: string, type: 'nutrition' | 'workout') {
    await this.notifyMember(memberId, {
      actionUrl:
        type === 'workout' ? '/ar/dashboard/member/workouts' : '/ar/dashboard/member/nutrition',
      bodyAr:
        type === 'workout'
          ? 'قام المدرب بتحديث برنامج التمرين الخاص بك'
          : 'قام المدرب بتحديث خطة التغذية الخاصة بك',
      titleAr: type === 'workout' ? 'تم تحديث برنامج التمرين' : 'تم تحديث خطة التغذية',
      type: NotificationType.COACHING,
    });
  }

  private async notifyMember(
    memberId: string,
    input: { actionUrl: string; bodyAr: string; titleAr: string; type: NotificationType },
  ) {
    const member = await this.prisma.memberProfile.findUnique({
      select: { userId: true },
      where: { id: memberId },
    });

    if (member) {
      await this.notifications.create({ ...input, userId: member.userId });
    }
  }
}
