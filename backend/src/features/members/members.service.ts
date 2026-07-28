import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  AssignmentStatus,
  CoachProfileChangeStatus,
  CoachPlanRequirement,
  CoachRequestStatus,
  CoachRequestType,
  CoachSubscriptionAction,
  NotificationType,
  NutritionAiMessageRole,
  Prisma,
  UserRole,
  WorkoutLogSource,
} from '@prisma/client';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ageFromDateOfBirth } from '../../common/utils/age.util';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  CalculatorDto,
  CreateWorkoutLogDto,
  FoodAnalysisDto,
  NutritionChatHistoryQueryDto,
  UpdateMemberProfileDto,
} from './dto/members.dto';
import { NutritionAiQuotaService } from './nutrition-ai-quota.service';
import { NutritionAiService } from './nutrition-ai.service';

function jsonObject(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : undefined;
}

type NutritionChatMessageView =
  | { createdAt: Date; id: string; role: 'user'; text: string }
  | {
      analysis: Record<string, Prisma.JsonValue>;
      createdAt: Date;
      id: string;
      role: 'analysis';
    };

@Injectable()
export class MembersService {
  constructor(
    private readonly memberships: MembershipsService,
    private readonly notifications: NotificationsService,
    private readonly nutritionAi: NutritionAiService,
    private readonly nutritionAiQuota: NutritionAiQuotaService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async dashboard(user: AuthenticatedUser) {
    const memberId = this.requireMember(user);
    await this.expirePrivateCoaching(memberId);
    const [member, attendanceCount, lastAttendance, membership, requests] = await Promise.all([
      this.prisma.memberProfile.findUniqueOrThrow({
        include: {
          assignments: {
            include: { coach: { include: { user: true } } },
            orderBy: { startedAt: 'desc' },
            take: 1,
            where: { status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.PAUSED] } },
          },
          user: true,
        },
        where: { id: memberId },
      }),
      this.prisma.attendanceRecord.count({ where: { memberId } }),
      this.prisma.attendanceRecord.findFirst({
        orderBy: { checkedInAt: 'desc' },
        where: { memberId },
      }),
      this.memberships.getMembershipSummary(memberId),
      this.prisma.coachRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        where: { memberId, status: CoachRequestStatus.PENDING },
      }),
    ]);
    const assignment = member.assignments[0];
    const planState = assignment
      ? await this.getPlanState(assignment.coachId, memberId, assignment.planRequirement)
      : null;
    const coachingEffectiveNow =
      assignment?.status === AssignmentStatus.PAUSED && assignment.pausedAt
        ? assignment.pausedAt.getTime()
        : Date.now();
    const remainingDays = assignment?.coachingEndsAt
      ? Math.max(
          0,
          Math.ceil((assignment.coachingEndsAt.getTime() - coachingEffectiveNow) / 86_400_000),
        )
      : 0;

    if (
      assignment?.status === AssignmentStatus.ACTIVE &&
      assignment.reminderEnabled &&
      assignment.coachingEndsAt &&
      remainingDays >= 1 &&
      remainingDays <= 5 &&
      planState?.isReady
    ) {
      await this.notifications.ensureCoachSubscriptionExpiryReminder({
        assignmentId: assignment.id,
        coachName: assignment.coach.user.fullName,
        coachUserId: assignment.coach.user.id,
        endsAt: assignment.coachingEndsAt,
        memberName: member.user.fullName,
        memberUserId: member.user.id,
        remainingDays,
      });
    }

    return {
      attendanceCount,
      assignedCoach: assignment?.coach.user.fullName ?? null,
      currentWeight: Number(member.currentWeightKg),
      goal: member.fitnessGoal,
      lastAttendance,
      member,
      membership,
      pendingRequests: requests,
      privateCoaching: assignment
        ? {
            coachName: assignment.coach.user.fullName,
            endsAt: assignment.coachingEndsAt,
            hasNutritionPlan: planState?.hasNutrition ?? false,
            hasWorkoutPlan: planState?.hasWorkout ?? false,
            isActive: assignment.status === AssignmentStatus.ACTIVE && remainingDays > 0,
            isReady: planState?.isReady ?? false,
            planRequirement: assignment.planRequirement,
            remainingDays,
            startsAt: assignment.coachingStartsAt,
            status: assignment.status,
            waitingMessage:
              assignment.status === AssignmentStatus.PAUSED && !assignment.coachingStartsAt
                ? 'مدربك يجهز خطتك الخاصة الآن. سنرسل لك إشعاراً لطيفاً فور تفعيلها.'
                : assignment.status === AssignmentStatus.PAUSED
                  ? 'التدريب الخاص متوقف حالياً، ويمكنك متابعة حسابك كلاعب عادي.'
                  : !planState?.isReady
                    ? 'مدربك يكمل تفاصيل خطتك الآن.'
                    : null,
          }
        : null,
    };
  }

  async updateProfile(
    user: AuthenticatedUser,
    dto: UpdateMemberProfileDto,
    photo?: Express.Multer.File,
  ) {
    const memberId = this.requireMember(user);
    const current = await this.prisma.memberProfile.findUniqueOrThrow({
      include: { user: true },
      where: { id: memberId },
    });
    const pending = await this.prisma.memberProfileChangeRequest.findFirst({
      where: { memberId, status: CoachProfileChangeStatus.PENDING },
    });
    if (pending) {
      throw new ConflictException('يوجد طلب تعديل قيد المراجعة بالفعل');
    }

    const requestedData: Record<string, boolean | number | string> = {};
    if (dto.fullName && dto.fullName !== current.user.fullName) {
      requestedData.fullName = dto.fullName;
    }
    if (dto.phone && dto.phone !== current.user.phone) {
      requestedData.phone = dto.phone;
    }
    if (dto.heightCm !== undefined && Number(dto.heightCm) !== Number(current.heightCm)) {
      requestedData.heightCm = dto.heightCm;
    }
    if (dto.weightKg !== undefined && Number(dto.weightKg) !== Number(current.currentWeightKg)) {
      requestedData.currentWeightKg = dto.weightKg;
    }

    const stagedAvatar = photo ? await this.storage.saveImage(photo, user.id) : null;
    if (stagedAvatar) requestedData.avatarChanged = true;

    if (!Object.keys(requestedData).length) {
      throw new BadRequestException('لم يتم إدخال أي تغيير جديد');
    }

    try {
      return await this.prisma.memberProfileChangeRequest.create({
        data: {
          memberId,
          requestedData,
          stagedAvatarId: stagedAvatar?.id,
        },
        include: { reviewer: { select: { fullName: true } } },
      });
    } catch (error) {
      if (stagedAvatar) await this.storage.deleteAsset(stagedAvatar.id);
      throw error;
    }
  }

  async profileHistory(user: AuthenticatedUser) {
    return this.prisma.profileUpdateHistory.findMany({
      orderBy: { createdAt: 'desc' },
      where: { userId: user.id },
    });
  }

  async profileChangeRequests(user: AuthenticatedUser) {
    const memberId = this.requireMember(user);
    return this.prisma.memberProfileChangeRequest.findMany({
      include: { reviewer: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      where: { memberId },
    });
  }

  async workoutPlans(user: AuthenticatedUser) {
    const memberId = await this.requireActiveMember(user);
    await this.expirePrivateCoaching(memberId);
    if (await this.hasPendingPhotoRequest(memberId)) return [];
    const assignment = await this.activePrivateCoaching(memberId);
    if (!assignment) return [];

    return this.prisma.workoutPlan.findMany({
      include: {
        coach: { include: { user: true } },
        items: { include: { exercise: { include: { category: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      where: { coachId: assignment.coachId, memberId, status: 'ACTIVE' },
    });
  }

  async nutritionPlans(user: AuthenticatedUser) {
    const memberId = await this.requireActiveMember(user);
    await this.expirePrivateCoaching(memberId);
    if (await this.hasPendingPhotoRequest(memberId)) return [];
    const assignment = await this.activePrivateCoaching(memberId);
    if (!assignment) return [];

    return this.prisma.nutritionPlan.findMany({
      include: { coach: { include: { user: true } }, meals: { include: { items: true } } },
      orderBy: { updatedAt: 'desc' },
      where: { coachId: assignment.coachId, memberId, status: 'ACTIVE' },
    });
  }

  async membershipHistory(user: AuthenticatedUser) {
    const memberId = this.requireMember(user);
    return this.prisma.subscription.findMany({
      include: {
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          select: {
            action: true,
            adminName: true,
            createdAt: true,
            newValue: true,
            previousValue: true,
            reason: true,
          },
        },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
      where: { memberId },
    });
  }

  async workoutLogs(user: AuthenticatedUser) {
    const memberId = this.requireMember(user);
    return this.prisma.workoutLog.findMany({
      include: {
        exercise: { include: { category: true } },
        planItem: true,
      },
      orderBy: { performedAt: 'desc' },
      take: 100,
      where: { memberId },
    });
  }

  async createWorkoutLog(user: AuthenticatedUser, dto: CreateWorkoutLogDto) {
    const memberId = await this.requireActiveMember(user);
    if (!dto.planItemId && !dto.exerciseId) {
      throw new BadRequestException('planItemId or exerciseId is required');
    }

    let source: WorkoutLogSource = WorkoutLogSource.GENERAL_LIBRARY;
    if (dto.planItemId) {
      const item = await this.prisma.workoutPlanItem.findFirst({
        include: { plan: true },
        where: { id: dto.planItemId, plan: { memberId } },
      });
      if (!item) throw new BadRequestException('Workout plan item not found');
      source = WorkoutLogSource.COACH_PLAN;
    }
    if (dto.exerciseId) {
      const exercise = await this.prisma.exercise.findFirst({
        where: { id: dto.exerciseId, isActive: true },
      });
      if (!exercise) throw new BadRequestException('Exercise not found');
    }

    return this.prisma.workoutLog.create({
      data: {
        completed: dto.completed ?? true,
        exerciseId: dto.exerciseId,
        isPersonalRecord: dto.isPersonalRecord ?? false,
        load: dto.load,
        memberId,
        notes: dto.notes,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
        planItemId: dto.planItemId,
        repsCompleted: dto.repsCompleted,
        setsCompleted: dto.setsCompleted,
        source,
      },
    });
  }

  async requests(user: AuthenticatedUser) {
    const memberId = this.requireMember(user);
    return this.prisma.coachRequest.findMany({
      include: { coach: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      where: { memberId },
    });
  }

  async completeRequest(user: AuthenticatedUser, id: string) {
    const memberId = this.requireMember(user);
    const request = await this.prisma.coachRequest.findUnique({ where: { id, memberId } });
    if (!request) throw new BadRequestException('Request not found');
    if (
      request.type === CoachRequestType.NEW_PHOTOS &&
      !request.requiredPhotoTypes.every((type) => request.submittedPhotoTypes.includes(type))
    ) {
      throw new BadRequestException('All required photo angles must be uploaded first');
    }
    return this.prisma.coachRequest.update({
      data: { completedAt: new Date(), status: CoachRequestStatus.COMPLETED },
      where: { id, memberId },
    });
  }

  async calculators(user: AuthenticatedUser, dto: CalculatorDto) {
    const memberId = await this.requireActiveMember(user);
    const member = await this.prisma.memberProfile.findUniqueOrThrow({
      where: { id: memberId },
    });
    const activity = dto.activityMultiplier ?? 1.45;
    const genderAdjustment = member.gender === 'MALE' ? 5 : -161;
    const age = ageFromDateOfBirth(member.dateOfBirth);
    const bmr =
      10 * Number(member.currentWeightKg) +
      6.25 * Number(member.heightCm) -
      5 * age +
      genderAdjustment;
    const maintenanceCalories = Math.round(bmr * activity);
    const cuttingCalories = Math.round(maintenanceCalories * 0.82);
    const bulkingCalories = Math.round(maintenanceCalories * 1.12);
    const selectedCalories =
      dto.mode === 'cutting'
        ? cuttingCalories
        : dto.mode === 'bulking'
          ? bulkingCalories
          : maintenanceCalories;
    const proteinG = Math.round(Number(member.currentWeightKg) * 2);
    const fatG = Math.round((selectedCalories * 0.25) / 9);
    const carbsG = Math.round((selectedCalories - proteinG * 4 - fatG * 9) / 4);

    return {
      calories: {
        bulking: bulkingCalories,
        cutting: cuttingCalories,
        maintenance: maintenanceCalories,
      },
      macros: {
        carbohydratesG: Math.max(0, carbsG),
        fatG,
        proteinG,
      },
      profile: {
        activityMultiplier: activity,
        age,
        fitnessGoal: member.fitnessGoal,
        heightCm: Number(member.heightCm),
        weightKg: Number(member.currentWeightKg),
      },
      selectedMode: dto.mode ?? 'maintenance',
    };
  }

  async analyzeFood(user: AuthenticatedUser, dto: FoodAnalysisDto) {
    const memberId = await this.requireActiveMember(user);
    const member = await this.prisma.memberProfile.findUniqueOrThrow({
      where: { id: memberId },
    });
    const age = ageFromDateOfBirth(member.dateOfBirth);
    const reservedAt = new Date();
    const recentMessages = await this.prisma.nutritionAiMessage.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 8,
      where: { userId: user.id },
    });
    const history = recentMessages
      .reverse()
      .flatMap((message): Array<{ content: string; role: 'assistant' | 'user' }> => {
        const content = jsonObject(message.content);
        const text =
          message.role === NutritionAiMessageRole.USER ? content?.text : content?.replyAr;
        if (typeof text !== 'string' || !text.trim()) return [];
        return [
          {
            content: text,
            role:
              message.role === NutritionAiMessageRole.USER
                ? ('user' as const)
                : ('assistant' as const),
          },
        ];
      });
    const usage = await this.nutritionAiQuota.reserve(user.id, reservedAt);

    try {
      const cleanMessage = dto.message.trim();
      const analysis = await this.nutritionAi.analyze(
        cleanMessage,
        {
          age,
          fitnessGoal: member.fitnessGoal,
          gender: member.gender,
          heightCm: Number(member.heightCm),
          weightKg: Number(member.currentWeightKg),
        },
        history,
      );
      const userCreatedAt = new Date();
      const assistantCreatedAt = new Date(userCreatedAt.getTime() + 1);
      const [userMessage, assistantMessage] = await this.prisma.$transaction([
        this.prisma.nutritionAiMessage.create({
          data: {
            content: { text: cleanMessage },
            createdAt: userCreatedAt,
            role: NutritionAiMessageRole.USER,
            userId: user.id,
          },
        }),
        this.prisma.nutritionAiMessage.create({
          data: {
            content: analysis,
            createdAt: assistantCreatedAt,
            role: NutritionAiMessageRole.ASSISTANT,
            userId: user.id,
          },
        }),
      ]);
      return {
        ...analysis,
        messages: [
          {
            createdAt: userMessage.createdAt,
            id: userMessage.id,
            role: 'user' as const,
            text: cleanMessage,
          },
          {
            analysis,
            createdAt: assistantMessage.createdAt,
            id: assistantMessage.id,
            role: 'analysis' as const,
          },
        ],
        usage,
      };
    } catch (error) {
      await this.nutritionAiQuota.release(user.id, reservedAt).catch(() => undefined);
      throw error;
    }
  }

  async nutritionAiUsage(user: AuthenticatedUser) {
    await this.requireActiveMember(user);
    return this.nutritionAiQuota.getUsage(user.id);
  }

  async nutritionAiHistory(user: AuthenticatedUser, query: NutritionChatHistoryQueryDto) {
    await this.requireActiveMember(user);
    const pageSize = query.pageSize ?? 12;
    const rows = await this.prisma.nutritionAiMessage.findMany({
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      where: { userId: user.id },
    });
    const hasMore = rows.length > pageSize;
    const page = rows.slice(0, pageSize);
    const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;
    const items = [...page].reverse().flatMap<NutritionChatMessageView>((message) => {
      const content = jsonObject(message.content);
      if (message.role === NutritionAiMessageRole.USER) {
        return typeof content?.text === 'string'
          ? [
              {
                createdAt: message.createdAt,
                id: message.id,
                role: 'user' as const,
                text: content.text,
              },
            ]
          : [];
      }
      return typeof content?.replyAr === 'string'
        ? [
            {
              analysis: content,
              createdAt: message.createdAt,
              id: message.id,
              role: 'analysis' as const,
            },
          ]
        : [];
    });

    return {
      items,
      nextCursor,
    };
  }

  private requireMember(user: AuthenticatedUser): string {
    if (user.role !== UserRole.MEMBER || !user.memberProfileId) {
      throw new ForbiddenException('Member profile is required');
    }

    return user.memberProfileId;
  }

  private async activePrivateCoaching(memberId: string) {
    return this.prisma.coachAssignment.findFirst({
      where: {
        coachingEndsAt: { gt: new Date() },
        memberId,
        status: AssignmentStatus.ACTIVE,
      },
    });
  }

  private async hasPendingPhotoRequest(memberId: string) {
    return Boolean(
      await this.prisma.coachRequest.findFirst({
        select: { id: true },
        where: {
          memberId,
          status: CoachRequestStatus.PENDING,
          type: CoachRequestType.NEW_PHOTOS,
        },
      }),
    );
  }

  private async expirePrivateCoaching(memberId: string) {
    const assignment = await this.prisma.coachAssignment.findFirst({
      include: { member: true },
      where: {
        coachingEndsAt: { lte: new Date() },
        memberId,
        status: AssignmentStatus.ACTIVE,
      },
    });
    if (!assignment) return;

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
          memberId,
          previousEndsAt: assignment.coachingEndsAt,
        },
      });
      return true;
    });
    if (!expired) return;

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

  private async getPlanState(coachId: string, memberId: string, requirement: CoachPlanRequirement) {
    const [workoutPlans, nutritionPlans] = await Promise.all([
      this.prisma.workoutPlan.count({ where: { coachId, memberId, status: 'ACTIVE' } }),
      this.prisma.nutritionPlan.count({ where: { coachId, memberId, status: 'ACTIVE' } }),
    ]);
    const hasWorkout = workoutPlans > 0;
    const hasNutrition = nutritionPlans > 0;
    return {
      hasNutrition,
      hasWorkout,
      isReady:
        (requirement === CoachPlanRequirement.EITHER && (hasWorkout || hasNutrition)) ||
        (requirement === CoachPlanRequirement.WORKOUT && hasWorkout) ||
        (requirement === CoachPlanRequirement.NUTRITION && hasNutrition) ||
        (requirement === CoachPlanRequirement.BOTH && hasWorkout && hasNutrition),
    };
  }

  private async requireActiveMember(user: AuthenticatedUser): Promise<string> {
    const memberId = this.requireMember(user);
    const membership = await this.memberships.getMembershipSummary(memberId);

    if (membership.isExpired || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Your subscription has expired. Please contact Pro Gym administration.',
      );
    }

    return memberId;
  }
}
