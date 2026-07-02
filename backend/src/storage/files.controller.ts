import { Controller, ForbiddenException, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { FileVisibility, UserRole } from '@prisma/client';
import type { Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Protected } from '../common/decorators/protected.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

@Controller('files')
export class FilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get(':id')
  @Protected()
  async getFile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const file = await this.prisma.fileAsset.findUnique({
      include: {
        owner: {
          include: {
            memberProfile: {
              include: {
                assignments: {
                  select: { coachId: true },
                  where: { status: { in: ['ACTIVE', 'PAUSED'] } },
                },
              },
            },
          },
        },
        progressPhoto: {
          include: {
            member: {
              include: {
                assignments: {
                  where: { status: 'ACTIVE' },
                  select: { coachId: true },
                },
              },
            },
          },
        },
      },
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const ownsFile = file.ownerUserId === user.id;
    const isAdminNonProgressFile = user.role === UserRole.ADMIN && !file.progressPhoto;
    const isPublic = file.visibility === FileVisibility.PUBLIC;
    const isAssignedCoachAvatar =
      user.role === UserRole.COACH &&
      !!user.coachProfileId &&
      !file.progressPhoto &&
      file.owner?.avatarUrl === `/api/v1/files/${file.id}` &&
      file.owner.memberProfile?.assignments.some(
        (assignment) => assignment.coachId === user.coachProfileId,
      );
    const isAssignedCoach =
      user.role === UserRole.COACH &&
      !!user.coachProfileId &&
      file.progressPhoto?.member.assignments.some(
        (assignment) => assignment.coachId === user.coachProfileId,
      );

    if (
      !isPublic &&
      !ownsFile &&
      !isAssignedCoach &&
      !isAssignedCoachAvatar &&
      !isAdminNonProgressFile
    ) {
      throw new ForbiddenException('You do not have access to this file');
    }

    response.type(file.mimeType);
    response.sendFile(this.storage.getAbsolutePath(file.storageKey));
  }
}
