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
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifySecurityQuestionsDto,
} from './dto/auth.dto';

interface CookieRequest {
  cookies?: Record<string, string | undefined>;
}

function getCookie(request: CookieRequest, name: string): string | undefined {
  return request.cookies?.[name];
}

function setAuthCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string; csrfToken: string },
) {
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    maxAge: 15 * 60 * 1000,
    sameSite: 'lax',
    secure: isProduction,
  });
  response.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    maxAge: 30 * 86_400_000,
    sameSite: 'lax',
    secure: isProduction,
  });
  response.cookie('csrf_token', tokens.csrfToken, {
    httpOnly: false,
    maxAge: 30 * 86_400_000,
    sameSite: 'lax',
    secure: isProduction,
  });
}

function clearAuthCookies(response: Response) {
  response.clearCookie('access_token');
  response.clearCookie('refresh_token');
  response.clearCookie('csrf_token');
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('security-questions')
  getSecurityQuestions() {
    return { data: this.authService.getSecurityQuestions() };
  }

  @Post('register')
  @UseInterceptors(FileInterceptor('photo'))
  async register(
    @Body() dto: RegisterDto,
    @UploadedFile() photo: Express.Multer.File | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto, photo);
    setAuthCookies(response, result.tokens);
    return { data: result.user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    setAuthCookies(response, result.tokens);
    return { data: result.user };
  }

  @Post('refresh')
  async refresh(@Req() request: CookieRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.refresh(getCookie(request, 'refresh_token'));
    setAuthCookies(response, result.tokens);
    return { data: result.user };
  }

  @Post('logout')
  async logout(@Req() request: CookieRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.logout(getCookie(request, 'refresh_token'));
    clearAuthCookies(response);
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
