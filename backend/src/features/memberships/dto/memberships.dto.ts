import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class MembershipMemberSearchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  q!: string;
}

export class CreateMembershipPlanDto {
  @IsString()
  @IsNotEmpty()
  nameAr!: string;

  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  durationDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMinor!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMembershipPlanDto {
  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMinor?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSubscriptionDto {
  @IsString()
  memberId!: string;

  @IsOptional()
  @IsString()
  observerId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class MembershipMutationDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  observerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  days?: number;

  @IsOptional()
  @IsString()
  planId?: string;
}
