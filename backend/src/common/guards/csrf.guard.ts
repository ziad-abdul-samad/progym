import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedRequest } from '../types/authenticated-user';
import {
  AUTH_SCOPE_HEADER,
  authScopeFromHeader,
  scopedAuthCookieName,
} from '../utils/auth-scope.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const scope = authScopeFromHeader(request.headers[AUTH_SCOPE_HEADER]);
    const cookieToken = request.cookies?.[scopedAuthCookieName('csrf_token', scope)];
    const headerToken = request.headers['x-csrf-token'];
    const token = Array.isArray(headerToken) ? headerToken[0] : headerToken;

    if (!cookieToken || !token || cookieToken !== token) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
