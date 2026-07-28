import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsInt,
} from 'class-validator';

export class UpdateMemberProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(80)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(25)
  @Max(350)
  weightKg?: number;
}

export class CalculatorDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1.2)
  @Max(2.2)
  activityMultiplier?: number;

  @IsOptional()
  @IsIn(['cutting', 'maintenance', 'bulking'])
  mode?: 'cutting' | 'maintenance' | 'bulking';
}

export class FoodAnalysisDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  message!: string;
}

export class NutritionChatHistoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(6)
  @Max(30)
  pageSize: number = 12;
}

export class CreateWorkoutLogDto {
  @IsOptional()
  @IsString()
  planItemId?: string;

  @IsOptional()
  @IsString()
  exerciseId?: string;

  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  setsCompleted?: number;

  @IsOptional()
  @IsString()
  repsCompleted?: string;

  @IsOptional()
  @IsString()
  load?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPersonalRecord?: boolean;
}
