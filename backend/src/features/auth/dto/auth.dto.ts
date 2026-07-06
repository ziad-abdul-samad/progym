import { Type } from 'class-transformer';
import {
  IsEnum,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class RegisterDto {
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @IsString()
  @Length(3, 50)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  passwordConfirmation!: string;

  @IsString()
  @Length(6, 30)
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
  @Length(2, 160)
  fitnessGoal!: string;

  @IsString()
  @IsNotEmpty()
  question1Key!: string;

  @IsString()
  @IsNotEmpty()
  question1Answer!: string;

  @IsString()
  @IsNotEmpty()
  question2Key!: string;

  @IsString()
  @IsNotEmpty()
  question2Answer!: string;

  @IsString()
  @IsNotEmpty()
  question3Key!: string;

  @IsString()
  @IsNotEmpty()
  question3Answer!: string;

  @IsOptional()
  @IsString()
  registrationToken?: string;
}

export class RegistrationStatusDto {
  @IsString()
  @IsNotEmpty()
  claimToken!: string;
}

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

export class VerifySecurityQuestionsDto {
  @IsString()
  username!: string;

  @IsString()
  question1Key!: string;

  @IsString()
  question1Answer!: string;

  @IsString()
  question2Key!: string;

  @IsString()
  question2Answer!: string;

  @IsString()
  question3Key!: string;

  @IsString()
  question3Answer!: string;
}

export class ResetPasswordDto {
  @IsString()
  resetToken!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
