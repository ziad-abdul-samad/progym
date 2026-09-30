import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsIn,
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
  @IsOptional()
  @IsIn(['MEN', 'WOMEN'])
  audience?: 'MEN' | 'WOMEN';

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nameAr!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
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
  @Max(2000000000)
  priceMinor!: number;

  @IsOptional()
  @IsString()
  @IsIn(['USD', 'SYP_NEW'])
  currency?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMembershipPlanDto {
  @IsOptional()
  @IsIn(['MEN', 'WOMEN'])
  audience?: 'MEN' | 'WOMEN';

  @IsOptional()
  @IsIn(['USD', 'SYP_NEW'])
  currency?: string;
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
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
  @Max(2000)
  durationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000000000)
  priceMinor?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class PaidPlanDto {
  @IsOptional()
  @IsString()
  planUpdatedAt?: string;

  @IsString()
  @MinLength(16)
  @MaxLength(120)
  requestKey!: string;
}

export class CreateSubscriptionDto extends PaidPlanDto {
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

export class MembershipMutationDto extends PaidPlanDto {
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
