import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CoachRequestStatus,
  CoachRequestType,
  NotificationType,
  ProgressPhotoType,
  UserRole,
} from '@prisma/client';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateProgressEntryDto, UploadProgressPhotoDto } from './dto/progress.dto';

@Injectable()
export class ProgressService {
  constructor(
    private readonly memberships: MembershipsService,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(user: AuthenticatedUser, memberId?: string) {
    const targetMemberId = await this.resolveAccessibleMember(user, memberId);

    return this.prisma.progressEntry.findMany({
      include: {
        photos: { include: { fileAsset: true } },
      },
      orderBy: { measuredAt: 'asc' },
      where: { memberId: targetMemberId },
    });
  }

  async create(user: AuthenticatedUser, dto: CreateProgressEntryDto) {
    const memberId = await this.resolveAccessibleMember(user, dto.memberId);
    const member = await this.prisma.memberProfile.findUniqueOrThrow({
      include: { user: true },
      where: { id: memberId },
    });

    const entry = await this.prisma.progressEntry.create({
      data: {
        armsCm: dto.armsCm,
        authorCoachId: user.role === UserRole.COACH ? user.coachProfileId : undefined,
        authorUserId: user.id,
        bodyFatPercent: dto.bodyFatPercent,
        chestCm: dto.chestCm,
        hipsCm: dto.hipsCm,
        measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : new Date(),
        memberId,
        notes: dto.notes,
        thighsCm: dto.thighsCm,
        waistCm: dto.waistCm,
        weightKg: dto.weightKg,
      },
    });

    if (dto.weightKg) {
      await this.prisma.memberProfile.update({
        data: { currentWeightKg: dto.weightKg },
        where: { id: memberId },
      });
    }

    if (user.role !== UserRole.MEMBER) {
      await this.notifications.create({
        actionUrl: '/ar/dashboard/member/progress',
        bodyAr: 'تم تحديث سجل القياسات الخاص بك',
        metadata: { progressEntryId: entry.id },
        titleAr: 'تحديث جديد في القياسات',
        type: NotificationType.PROGRESS,
        userId: member.userId,
      });
    }

    return entry;
  }

  async uploadPhoto(
    user: AuthenticatedUser,
    dto: UploadProgressPhotoDto,
    file?: Express.Multer.File,
  ) {
    const memberId = await this.resolveAccessibleMember(user, dto.memberId);
    const member = await this.prisma.memberProfile.findUniqueOrThrow({
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          include: { coach: { include: { user: true } } },
        },
        user: true,
      },
      where: { id: memberId },
    });
    const asset = await this.storage.saveImage(file, user.id);

    const photo = await this.prisma.progressPhoto.create({
      data: {
        capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : undefined,
        fileAssetId: asset.id,
        memberId,
        progressEntryId: dto.progressEntryId,
        type: dto.type,
      },
      include: { fileAsset: true },
    });

    for (const assignment of member.assignments) {
      await this.notifications.create({
        actionUrl: `/ar/dashboard/coach/clients/${memberId}`,
        bodyAr: `${member.user.fullName} قام برفع صورة تقدم جديدة`,
        metadata: { progressPhotoId: photo.id },
        titleAr: 'صورة تقدم جديدة',
        type: NotificationType.PROGRESS,
        userId: assignment.coach.userId,
      });
    }

    if (user.role === UserRole.MEMBER) {
      const pendingRequests = await this.prisma.coachRequest.findMany({
        where: {
          memberId,
          status: CoachRequestStatus.PENDING,
          type: CoachRequestType.NEW_PHOTOS,
        },
      });
      for (const request of pendingRequests) {
        const submitted = Array.from(new Set([...request.submittedPhotoTypes, dto.type]));
        const completed = request.requiredPhotoTypes.every((type) => submitted.includes(type));
        await this.prisma.coachRequest.update({
          data: {
            completedAt: completed ? new Date() : null,
            status: completed ? CoachRequestStatus.COMPLETED : CoachRequestStatus.PENDING,
            submittedPhotoTypes: submitted,
          },
          where: { id: request.id },
        });
      }
    }

    return photo;
  }

  async photos(user: AuthenticatedUser, memberId?: string) {
    const targetMemberId = await this.resolveAccessibleMember(user, memberId);

    return this.prisma.progressPhoto.findMany({
      include: { fileAsset: true, progressEntry: true },
      orderBy: { createdAt: 'desc' },
      where: { memberId: targetMemberId },
    });
  }

  async comparison(user: AuthenticatedUser, memberId?: string) {
    const items = await this.photos(user, memberId);
    const types = [
      ProgressPhotoType.FRONT,
      ProgressPhotoType.SIDE,
      ProgressPhotoType.BACK,
    ] as const;
    return Object.fromEntries(
      types.map((type) => {
        const matching = items.filter((item) => item.type === type);
        return [
          type,
          {
            baseline: matching.at(-1) ?? null,
            latest: matching[0] ?? null,
            monthThree:
              matching.find(
                (item) => item.createdAt <= new Date(Date.now() - 90 * 86_400_000),
              ) ?? null,
            weekEight:
              matching.find(
                (item) => item.createdAt <= new Date(Date.now() - 56 * 86_400_000),
              ) ?? null,
          },
        ];
      }),
    );
  }

  private async resolveAccessibleMember(
    user: AuthenticatedUser,
    requestedMemberId?: string,
  ): Promise<string> {
    const targetMemberId = requestedMemberId ?? user.memberProfileId;

    if (!targetMemberId) {
      throw new ForbiddenException('Member context is required');
    }

    if (user.role === UserRole.ADMIN || targetMemberId === user.memberProfileId) {
      if (user.role === UserRole.MEMBER) {
        const membership = await this.memberships.getMembershipSummary(targetMemberId);
        if (membership.isExpired || membership.status !== 'ACTIVE') {
          throw new ForbiddenException(
            'Your subscription has expired. Please contact Pro Gym administration.',
          );
        }
      }
      return targetMemberId;
    }

    if (user.role === UserRole.COACH && user.coachProfileId) {
      const assignment = await this.prisma.coachAssignment.findFirst({
        where: {
          coachId: user.coachProfileId,
          memberId: targetMemberId,
          status: 'ACTIVE',
        },
      });

      if (assignment) return targetMemberId;
    }

    throw new NotFoundException('Member not found');
  }
}
