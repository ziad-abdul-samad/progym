import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { ProgressPhotoType } from '@prisma/client';

function emptyStringToUndefined({ value }: { value: unknown }) {
  return value === '' ? undefined : value;
}

export class CreateProgressEntryDto {
  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Type(() => Number)
  @Min(25)
  @Max(350)
  weightKg?: number;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Type(() => Number)
  @Min(20)
  @Max(250)
  chestCm?: number;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Type(() => Number)
  @Min(20)
  @Max(250)
  waistCm?: number;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Type(() => Number)
  @Min(10)
  @Max(120)
  armsCm?: number;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Type(() => Number)
  @Min(20)
  @Max(250)
  hipsCm?: number;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Type(() => Number)
  @Min(20)
  @Max(250)
  thighsCm?: number;

  @IsOptional()
  @Transform(emptyStringToUndefined)
  @Type(() => Number)
  @Min(1)
  @Max(80)
  bodyFatPercent?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UploadProgressPhotoDto {
  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  progressEntryId?: string;

  @IsEnum(ProgressPhotoType)
  type!: ProgressPhotoType;

  @IsOptional()
  @IsDateString()
  capturedAt?: string;
}
