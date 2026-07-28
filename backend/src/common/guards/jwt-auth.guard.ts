import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from '../types/authenticated-user';
import {
  AUTH_SCOPE_HEADER,
  authScopeFromHeader,
  scopedAuthCookieName,
} from '../utils/auth-scope.util';

interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

function getBearerToken(header: string | string[] | undefined): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;

  if (!value?.startsWith('Bearer ')) {
    return undefined;
  }

  return value.slice('Bearer '.length);
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const scope = authScopeFromHeader(request.headers[AUTH_SCOPE_HEADER]);
    const token =
      request.cookies?.[scopedAuthCookieName('access_token', scope)] ??
      getBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Authentication is required');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        status: true,
        memberProfile: { select: { id: true } },
        coachProfile: { select: { id: true } },
        shiftObserver: { select: { id: true } },
      },
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    request.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      memberProfileId: user.memberProfile?.id,
      coachProfileId: user.coachProfile?.id,
      shiftObserverId: user.shiftObserver?.id,
    };

    return true;
  }
}
