import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  AUTH_SCOPE_HEADER,
  authScopeForRole,
  authScopeFromHeader,
  scopedAuthCookieName,
  type AuthScope,
} from '../../common/utils/auth-scope.util';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RegistrationStatusDto,
  ResetPasswordDto,
  VerifySecurityQuestionsDto,
} from './dto/auth.dto';

interface CookieRequest {
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

function requestAuthScope(request: CookieRequest): AuthScope | undefined {
  return authScopeFromHeader(request.headers[AUTH_SCOPE_HEADER]);
}

function getAuthCookie(
  request: CookieRequest,
  name: 'access_token' | 'csrf_token' | 'refresh_token',
): string | undefined {
  return request.cookies?.[scopedAuthCookieName(name, requestAuthScope(request))];
}

function setAuthCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string; csrfToken: string },
  role: UserRole,
) {
  const isProduction = process.env.NODE_ENV === 'production';
  const scope = authScopeForRole(role);

  response.cookie(scopedAuthCookieName('access_token', scope), tokens.accessToken, {
    httpOnly: true,
    maxAge: 15 * 60 * 1000,
    sameSite: 'lax',
    secure: isProduction,
  });
  response.cookie(scopedAuthCookieName('refresh_token', scope), tokens.refreshToken, {
    httpOnly: true,
    maxAge: 365 * 86_400_000,
    sameSite: 'lax',
    secure: isProduction,
  });
  response.cookie(scopedAuthCookieName('csrf_token', scope), tokens.csrfToken, {
    httpOnly: false,
    maxAge: 365 * 86_400_000,
    sameSite: 'lax',
    secure: isProduction,
  });
}

function clearAuthCookies(response: Response, scope?: AuthScope) {
  response.clearCookie(scopedAuthCookieName('access_token', scope));
  response.clearCookie(scopedAuthCookieName('refresh_token', scope));
  response.clearCookie(scopedAuthCookieName('csrf_token', scope));
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('security-questions')
  getSecurityQuestions() {
    return { data: this.authService.getSecurityQuestions() };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async register(@Body() dto: RegisterDto, @UploadedFile() photo: Express.Multer.File | undefined) {
    const result = await this.authService.register(dto, photo);
    return { data: result };
  }

  @Post('registration-status')
  async registrationStatus(
    @Body() dto: RegistrationStatusDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.registrationStatus(dto.claimToken);
    if ('tokens' in result && result.tokens) {
      setAuthCookies(response, result.tokens, result.user.role);
      return { data: { status: result.status, user: result.user } };
    }
    return { data: result };
  }

  @Post('login')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    setAuthCookies(response, result.tokens, result.user.role);
    return { data: result.user };
  }

  @Post('refresh')
  async refresh(@Req() request: CookieRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.refresh(getAuthCookie(request, 'refresh_token'));
    setAuthCookies(response, result.tokens, result.user.role);
    return { data: result.user };
  }

  @Post('logout')
  async logout(@Req() request: CookieRequest, @Res({ passthrough: true }) response: Response) {
    const scope = requestAuthScope(request);
    const result = await this.authService.logout(getAuthCookie(request, 'refresh_token'));
    clearAuthCookies(response, scope);
    return { data: result };
  }

  @Get('me')
  @Protected()
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.authService.getSessionUser(user.id) };
  }

  @Post('forgot-password/verify')
  async verifySecurityQuestions(@Body() dto: VerifySecurityQuestionsDto) {
    return { data: await this.authService.verifySecurityQuestions(dto) };
  }

  @Post('forgot-password/reset')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return { data: await this.authService.resetPassword(dto) };
  }
}
