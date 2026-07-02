import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CoachPlanRequirement,
  CoachRequestType,
  NutritionPlanStatus,
  WorkoutPlanStatus,
} from '@prisma/client';

export class AddCoachClientDto {
  @IsString()
  memberId!: string;
}

export class ManageCoachSubscriptionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(730)
  days!: number;

  @IsEnum(CoachPlanRequirement)
  planRequirement!: CoachPlanRequirement;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  reminderEnabled?: boolean;
}

export class WorkoutPlanItemDto {
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @IsOptional()
  @IsString()
  exerciseName?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  dayIndex!: number;

  @IsOptional()
  @IsString()
  dayTitle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sets?: number;

  @IsOptional()
  @IsString()
  reps?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Matches(/^https?:\/\/(?:www\.)?(?:youtube\.com\/|youtu\.be\/)/i, {
    message: 'videoUrl must be a valid YouTube URL',
  })
  videoUrl?: string;
}

export class CreateWorkoutPlanDto {
  @IsString()
  memberId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(WorkoutPlanStatus)
  status?: WorkoutPlanStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutPlanItemDto)
  items!: WorkoutPlanItemDto[];
}

export class NutritionFoodItemDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  quantity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  calories?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  proteinG?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  carbsG?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fatG?: number;
}

export class NutritionMealDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  timing?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NutritionFoodItemDto)
  items!: NutritionFoodItemDto[];
}

export class CreateNutritionPlanDto {
  @IsString()
  memberId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  targetMode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetCalories?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetProteinG?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetCarbsG?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetFatG?: number;

  @IsOptional()
  @IsEnum(NutritionPlanStatus)
  status?: NutritionPlanStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NutritionMealDto)
  meals!: NutritionMealDto[];
}

export class CreateCoachRequestDto {
  @IsString()
  memberId!: string;

  @IsEnum(CoachRequestType)
  type!: CoachRequestType;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class CoachProfileChangeDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bioAr?: string;
}
