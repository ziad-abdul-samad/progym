import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceQrDto,
  ManualAttendanceDto,
  ScanAttendanceDto,
  VoidAttendanceDto,
} from './dto/attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('qr')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async createQr(@Body() dto: CreateAttendanceQrDto, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.attendance.createQr(admin, dto.expiresInMinutes) };
  }

  @Post('scan')
  @Protected(UserRole.MEMBER)
  async scan(@Body() dto: ScanAttendanceDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.attendance.scan(user, dto.token) };
  }

  @Post('entry')
  @Protected(UserRole.MEMBER)
  async entry(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.attendance.entry(user) };
  }

  @Post('manual')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async manual(@Body() dto: ManualAttendanceDto, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.attendance.manualRecord(admin, dto.memberId, dto.notes) };
  }

  @Get('recent')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async recent() {
    return { data: await this.attendance.recentCheckIns() };
  }

  @Get('me')
  @Protected(UserRole.MEMBER)
  async me(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return { data: await this.attendance.memberHistory(user.memberProfileId ?? '', query) };
  }

  @Get()
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async adminList(@Query() query: PaginationDto) {
    return { data: await this.attendance.adminList(query) };
  }

  @Patch(':id/void')
  @Protected(UserRole.ADMIN, UserRole.OBSERVER)
  async voidRecord(
    @Param('id') id: string,
    @Body() dto: VoidAttendanceDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.attendance.voidRecord(id, dto.reason, admin) };
  }
}
