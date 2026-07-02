import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

import { CsrfGuard } from '../guards/csrf.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

export const ROLES_KEY = 'roles';

export function Protected(...roles: UserRole[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, CsrfGuard, RolesGuard),
  );
}
