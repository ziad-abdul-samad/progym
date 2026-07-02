import { Body, Controller, Get, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateProgressEntryDto, UploadProgressPhotoDto } from './dto/progress.dto';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  @Protected(UserRole.MEMBER, UserRole.COACH)
  async list(@CurrentUser() user: AuthenticatedUser, @Query('memberId') memberId?: string) {
    return { data: await this.progress.list(user, memberId) };
  }

  @Post()
  @Protected(UserRole.MEMBER, UserRole.COACH)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProgressEntryDto) {
    return { data: await this.progress.create(user, dto) };
  }

  @Get('photos')
  @Protected(UserRole.MEMBER, UserRole.COACH)
  async photos(@CurrentUser() user: AuthenticatedUser, @Query('memberId') memberId?: string) {
    return { data: await this.progress.photos(user, memberId) };
  }

  @Post('photos')
  @Protected(UserRole.MEMBER, UserRole.COACH)
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadProgressPhotoDto,
    @UploadedFile() photo: Express.Multer.File | undefined,
  ) {
    return { data: await this.progress.uploadPhoto(user, dto, photo) };
  }

  @Get('photos/comparison')
  @Protected(UserRole.MEMBER, UserRole.COACH)
  async comparison(@CurrentUser() user: AuthenticatedUser, @Query('memberId') memberId?: string) {
    return { data: await this.progress.comparison(user, memberId) };
  }
}
