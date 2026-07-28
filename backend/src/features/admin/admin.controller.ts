import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AdminService } from './admin.service';
import {
  AdminCreateMemberDto,
  AdminNotificationDto,
  AdminUpdateUserDto,
  AssignClientDto,
  CreateRegistrationQrDto,
  CreateObserverDto,
  DemoteCoachDto,
  ResetPasswordByAdminDto,
  ReviewCoachProfileChangeDto,
  ReviewRegistrationRequestDto,
  UpdateObserverDto,
} from './dto/admin.dto';

@Controller('admin')
@Protected(UserRole.ADMIN, UserRole.OBSERVER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('members')
  async members(@Query() query: PaginationDto) {
    return { data: await this.adminService.members(query) };
  }

  @Get('audit-log')
  @Protected(UserRole.ADMIN)
  async auditLog(@Query() query: PaginationDto) {
    return { data: await this.adminService.auditLog(query) };
  }

  @Post('members')
  async createMember(@Body() dto: AdminCreateMemberDto, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.adminService.createMember(dto, admin) };
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.adminService.updateUser(id, dto, admin) };
  }

  @Patch('users/:id/suspend')
  async suspend(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.adminService.setUserStatus(id, UserStatus.SUSPENDED, admin) };
  }

  @Patch('users/:id/reactivate')
  async reactivate(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.adminService.setUserStatus(id, UserStatus.ACTIVE, admin) };
  }

  @Patch('users/:id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordByAdminDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.adminService.resetPassword(id, dto, admin) };
  }

  @Get('coaches/subscription-events')
  async coachSubscriptionEvents() {
    return { data: await this.adminService.coachSubscriptionEvents() };
  }

  @Get('coaches')
  async coaches(@Query() query: PaginationDto) {
    return { data: await this.adminService.coaches(query) };
  }

  @Post('coaches/promote/:userId')
  async promote(@Param('userId') userId: string, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.adminService.promoteMemberToCoach(userId, admin) };
  }

  @Post('coaches/demote/:userId')
  async demote(
    @Param('userId') userId: string,
    @Body() dto: DemoteCoachDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.adminService.demoteCoachToMember(userId, dto, admin) };
  }

  @Post('coaches/assign-client')
  async assign(@Body() dto: AssignClientDto, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.adminService.assignClient(dto, admin) };
  }

  @Get('coaches/profile-change-requests')
  async coachProfileChangeRequests() {
    return { data: await this.adminService.coachProfileChangeRequests() };
  }

  @Get('members/profile-change-requests')
  async memberProfileChangeRequests() {
    return { data: await this.adminService.memberProfileChangeRequests() };
  }

  @Post('members/profile-change-requests/:id/approve')
  async approveMemberProfileChange(
    @Param('id') id: string,
    @Body() dto: ReviewCoachProfileChangeDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.adminService.reviewMemberProfileChange(id, true, dto.reason, admin) };
  }

  @Post('members/profile-change-requests/:id/reject')
  async rejectMemberProfileChange(
    @Param('id') id: string,
    @Body() dto: ReviewCoachProfileChangeDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return {
      data: await this.adminService.reviewMemberProfileChange(id, false, dto.reason, admin),
    };
  }

  @Post('coaches/profile-change-requests/:id/approve')
  async approveCoachProfileChange(
    @Param('id') id: string,
    @Body() dto: ReviewCoachProfileChangeDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.adminService.reviewCoachProfileChange(id, true, dto.reason, admin) };
  }

  @Post('coaches/profile-change-requests/:id/reject')
  async rejectCoachProfileChange(
    @Param('id') id: string,
    @Body() dto: ReviewCoachProfileChangeDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.adminService.reviewCoachProfileChange(id, false, dto.reason, admin) };
  }

  @Post('registration-qr')
  async registrationQr(
    @Body() dto: CreateRegistrationQrDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.adminService.createRegistrationQr(dto, admin) };
  }

  @Get('observers')
  async observers(@Query() query: PaginationDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.adminService.observers(query, user) };
  }

  @Get('reception-feed')
  async receptionFeed() {
    return { data: await this.adminService.receptionFeed() };
  }

  @Get('registration-requests')
  async registrationRequests(@Query() query: PaginationDto) {
    return { data: await this.adminService.registrationRequests(query) };
  }

  @Post('registration-requests/:id/review')
  async reviewRegistrationRequest(
    @Param('id') id: string,
    @Body() dto: ReviewRegistrationRequestDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.adminService.reviewRegistrationRequest(id, dto, admin) };
  }

  @Post('observers')
  @Protected(UserRole.ADMIN)
  async createObserver(@Body() dto: CreateObserverDto, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.adminService.createObserver(dto, admin) };
  }

  @Patch('observers/:id')
  @Protected(UserRole.ADMIN)
  async updateObserver(
    @Param('id') id: string,
    @Body() dto: UpdateObserverDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return { data: await this.adminService.updateObserver(id, dto, admin) };
  }

  @Patch('observers/:id/activate')
  @Protected(UserRole.ADMIN)
  async activateObserver(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.adminService.setObserverActive(id, true, admin) };
  }

  @Patch('observers/:id/deactivate')
  @Protected(UserRole.ADMIN)
  async deactivateObserver(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.adminService.setObserverActive(id, false, admin) };
  }

  @Delete('observers/:id')
  @Protected(UserRole.ADMIN)
  async deleteObserver(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.adminService.deleteObserver(id, admin) };
  }

  @Get('observers/:id/activity')
  @Protected(UserRole.ADMIN)
  async observerActivity(@Param('id') id: string) {
    return { data: await this.adminService.observerActivity(id) };
  }

  @Post('notifications')
  @Protected(UserRole.ADMIN)
  async notify(@Body() dto: AdminNotificationDto, @CurrentUser() admin: AuthenticatedUser) {
    return { data: await this.adminService.notify(dto, admin) };
  }
}
