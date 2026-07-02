import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  CoachRequestStatus,
  CoachRequestType,
  QrInvitePurpose,
  QrInviteStatus,
  UserRole,
} from '@prisma/client';

import {
  hashPassword,
  hashSecurityAnswer,
  hashToken,
  normalizeUsername,
  randomToken,
  verifyPassword,
  verifySecurityAnswer,
} from '../../common/utils/hash.util';
import { ageFromDateOfBirth } from '../../common/utils/age.util';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { MembershipsService } from '../memberships/memberships.service';
import type {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifySecurityQuestionsDto,
} from './dto/auth.dto';
import { getSecurityQuestionText, SECURITY_QUESTIONS } from './security-questions';

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly memberships: MembershipsService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  getSecurityQuestions() {
    return SECURITY_QUESTIONS;
  }

  async register(dto: RegisterDto, photo?: Express.Multer.File) {
    if (dto.password !== dto.passwordConfirmation) {
      throw new BadRequestException('Password confirmation does not match');
    }
    if (!photo) {
      throw new BadRequestException('Personal photo is required');
    }

    const username = normalizeUsername(dto.username);
    const dateOfBirth = new Date(dto.dateOfBirth);
    const age = ageFromDateOfBirth(dateOfBirth);
    if (age < 10 || age > 100) {
      throw new BadRequestException('Date of birth must represent an age between 10 and 100');
    }
    const questionKeys = [dto.question1Key, dto.question2Key, dto.question3Key];

    if (new Set(questionKeys).size !== 3) {
      throw new BadRequestException('Security questions must be unique');
    }

    const questionTexts = questionKeys.map((key) => getSecurityQuestionText(key));

    if (questionTexts.some((text) => !text)) {
      throw new BadRequestException('Invalid security question selected');
    }

    const registrationInvite = await this.assertValidRegistrationToken(dto.registrationToken);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { phone: dto.phone }],
      },
    });

    if (existing) {
      throw new ConflictException('Username or phone number already exists');
    }

    const passwordHash = await hashPassword(dto.password);
    const securityHashes = await Promise.all([
      hashSecurityAnswer(dto.question1Answer),
      hashSecurityAnswer(dto.question2Answer),
      hashSecurityAnswer(dto.question3Answer),
    ]);
    const memberCode = `PG-${randomToken(5).toUpperCase()}`;
    const avatar = await this.storage.saveImage(photo, null);

    let user;
    try {
      user = await this.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.qrInvite.updateMany({
          data: {
            status: QrInviteStatus.USED,
            usedAt: new Date(),
          },
          where: {
            expiresAt: { gt: new Date() },
            id: registrationInvite.id,
            status: QrInviteStatus.ACTIVE,
          },
        });

        if (claimed.count !== 1) {
          throw new BadRequestException('Registration QR was already used');
        }

        const createdUser = await transaction.user.create({
          data: {
            avatarUrl: `/api/v1/files/${avatar.id}`,
            fullName: dto.fullName,
            passwordHash,
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
                memberCode,
                progressEntries: {
                  create: {
                    measuredAt: new Date(),
                    notes: 'Initial registration weight',
                    weightKg: dto.weightKg,
                  },
                },
              },
            },
            securityAnswers: {
              createMany: {
                data: questionKeys.map((questionKey, index) => ({
                  answerHash: securityHashes[index] ?? '',
                  questionKey,
                  questionText: questionTexts[index] ?? questionKey,
                })),
              },
            },
          },
          include: {
            coachProfile: true,
            memberProfile: true,
          },
        });

        await transaction.qrInvite.update({
          data: { consumedByUserId: createdUser.id },
          where: { id: registrationInvite.id },
        });
        await transaction.fileAsset.update({
          data: { ownerUserId: createdUser.id },
          where: { id: avatar.id },
        });

        return createdUser;
      });
    } catch (error) {
      await this.storage.deleteAsset(avatar.id);
      throw error;
    }

    const tokens = await this.createTokenSet(user.id);

    return {
      tokens,
      user: await this.getSessionUser(user.id),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      include: {
        coachProfile: true,
        memberProfile: true,
      },
      where: { username: normalizeUsername(dto.username) },
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !(await verifyPassword(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException('Invalid username or password');
    }

    await this.prisma.user.update({
      data: { lastLoginAt: new Date() },
      where: { id: user.id },
    });

    return {
      tokens: await this.createTokenSet(user.id),
      user: await this.getSessionUser(user.id),
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = hashToken(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      include: { user: true },
      where: { tokenHash },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshSession.update({
      data: { revokedAt: new Date() },
      where: { id: session.id },
    });

    return {
      tokens: await this.createTokenSet(session.userId),
      user: await this.getSessionUser(session.userId),
    };
  }

  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      await this.prisma.refreshSession.updateMany({
        data: { revokedAt: new Date() },
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      });
    }

    return { success: true };
  }

  async getSessionUser(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      include: {
        coachProfile: true,
        memberProfile: true,
      },
      where: { id: userId },
    });

    const membership = user.memberProfile
      ? await this.memberships.getMembershipSummary(user.memberProfile.id)
      : null;
    const pendingPhotoRequest = user.memberProfile
      ? await this.prisma.coachRequest.findFirst({
          include: { coach: { include: { user: { select: { fullName: true } } } } },
          orderBy: { createdAt: 'desc' },
          where: {
            memberId: user.memberProfile.id,
            status: CoachRequestStatus.PENDING,
            type: CoachRequestType.NEW_PHOTOS,
          },
        })
      : null;
    const assignedCoach = user.memberProfile
      ? await this.prisma.coachAssignment.findFirst({
          include: {
            coach: {
              include: {
                user: { select: { avatarUrl: true, fullName: true } },
              },
            },
          },
          orderBy: { startedAt: 'desc' },
          where: {
            memberId: user.memberProfile.id,
            status: { in: ['ACTIVE', 'PAUSED'] },
          },
        })
      : null;

    return {
      assignedCoach: assignedCoach
        ? {
            avatarUrl: assignedCoach.coach.user.avatarUrl,
            fullName: assignedCoach.coach.user.fullName,
            status: assignedCoach.status,
          }
        : null,
      id: user.id,
      avatarUrl: user.avatarUrl,
      coachProfileId: user.coachProfile?.id ?? null,
      fullName: user.fullName,
      memberProfileId: user.memberProfile?.id ?? null,
      membership,
      pendingPhotoRequest,
      role: user.role,
      status: user.status,
      username: user.username,
    };
  }

  async verifySecurityQuestions(dto: VerifySecurityQuestionsDto) {
    const user = await this.prisma.user.findUnique({
      include: { securityAnswers: true },
      where: { username: normalizeUsername(dto.username) },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid security answers');
    }

    const answers = [
      { key: dto.question1Key, answer: dto.question1Answer },
      { key: dto.question2Key, answer: dto.question2Answer },
      { key: dto.question3Key, answer: dto.question3Answer },
    ];

    for (const answer of answers) {
      const stored = user.securityAnswers.find((item) => item.questionKey === answer.key);

      if (!stored || !(await verifySecurityAnswer(stored.answerHash, answer.answer))) {
        throw new UnauthorizedException('Invalid security answers');
      }
    }

    return {
      resetToken: await this.jwtService.signAsync(
        { sub: user.id, type: 'password-reset' },
        {
          expiresIn: '10m',
          secret:
            process.env.JWT_RESET_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'dev-reset-secret',
        },
      ),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub: string; type: string };

    try {
      payload = await this.jwtService.verifyAsync(dto.resetToken, {
        secret: process.env.JWT_RESET_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'dev-reset-secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (payload.type !== 'password-reset') {
      throw new UnauthorizedException('Invalid reset token');
    }

    await this.prisma.user.update({
      data: { passwordHash: await hashPassword(dto.newPassword) },
      where: { id: payload.sub },
    });

    await this.prisma.refreshSession.updateMany({
      data: { revokedAt: new Date() },
      where: { userId: payload.sub, revokedAt: null },
    });

    return { success: true };
  }

  private async assertValidRegistrationToken(token: string) {
    const invite = await this.prisma.qrInvite.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (
      !invite ||
      invite.purpose !== QrInvitePurpose.MEMBER_REGISTRATION ||
      invite.status !== QrInviteStatus.ACTIVE ||
      invite.expiresAt < new Date()
    ) {
      throw new BadRequestException('Registration QR is invalid or expired');
    }

    return invite;
  }

  private async createTokenSet(userId: string): Promise<TokenSet> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, type: 'access' },
      {
        expiresIn: '15m',
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      },
    );
    const refreshToken = randomToken(48);
    const csrfToken = randomToken(24);

    await this.prisma.refreshSession.create({
      data: {
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
        tokenHash: hashToken(refreshToken),
        userId,
      },
    });

    return { accessToken, csrfToken, refreshToken };
  }
}
