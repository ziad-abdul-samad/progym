import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class AdminCreateMemberDto {
  @IsString()
  fullName!: string;

  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  phone!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @Type(() => Number)
  @Min(80)
  @Max(250)
  heightCm!: number;

  @Type(() => Number)
  @Min(25)
  @Max(350)
  weightKg!: number;

  @IsString()
  fitnessGoal!: string;
}

export class AdminCreateCoachDto {
  @IsString()
  fullName!: string;

  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  specialties?: string;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateObserverDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateObserverDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ResetPasswordByAdminDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class AssignClientDto {
  @IsString()
  memberId!: string;

  @IsString()
  coachId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class DemoteCoachDto {
  @IsString()
  reason!: string;
}

export class ReviewCoachProfileChangeDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateRegistrationQrDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays = 30;
}

export class ReviewRegistrationRequestDto {
  @Type(() => Boolean)
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  days?: number;

  @IsOptional()
  @IsString()
  observerId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminNotificationDto {
  @IsOptional()
  @IsIn(['USER', 'ALL_MEMBERS', 'ACTIVE_MEMBERS', 'EXPIRED_MEMBERS', 'PRIVATE_CLIENTS'])
  target?: 'USER' | 'ALL_MEMBERS' | 'ACTIVE_MEMBERS' | 'EXPIRED_MEMBERS' | 'PRIVATE_CLIENTS';

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  titleAr!: string;

  @IsString()
  bodyAr!: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;
}
