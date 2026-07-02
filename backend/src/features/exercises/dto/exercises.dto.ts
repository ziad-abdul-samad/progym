import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExerciseCategoryDto {
  @IsString()
  slug!: string;

  @IsString()
  nameAr!: string;

  @IsString()
  nameEn!: string;
}

export class CreateExerciseDto {
  @IsString()
  categoryId!: string;

  @IsString()
  nameAr!: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  instructionsAr?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  trainingDay?: number;
}
