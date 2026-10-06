import { Type } from 'class-transformer';
import {
  IsIn,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class FinanceRangeDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;
}
export class ExpenseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000000000)
  amountMinor!: number;
  @IsIn(['USD', 'SYP_NEW'])
  currency!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  spentOn!: string;
  @IsString()
  @MinLength(16)
  @MaxLength(120)
  requestKey!: string;
}
export class VoidExpenseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class SalaryRecipientsQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month!: string;
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
  @IsOptional()
  @IsIn(['ACTIVE', 'ARCHIVED'])
  status: string = 'ACTIVE';
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;
}

export class SalaryRecipientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000000000)
  salaryMinor!: number;
  @IsIn(['USD', 'SYP_NEW'])
  currency!: string;
}

export class UpdateSalaryRecipientDto extends SalaryRecipientDto {
  @IsDateString()
  expectedUpdatedAt!: string;
}

export class SalaryRecipientStatusDto {
  @IsBoolean()
  archived!: boolean;
  @IsDateString()
  expectedUpdatedAt!: string;
}

export class SalaryPaymentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  recipientId!: string;
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month!: string;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000000000)
  amountMinor!: number;
  @IsIn(['USD', 'SYP_NEW'])
  currency!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  spentOn!: string;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
  @IsString()
  @MinLength(16)
  @MaxLength(120)
  requestKey!: string;
  @IsDateString()
  expectedUpdatedAt!: string;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  previousPaymentCount!: number;
  @IsOptional()
  @IsBoolean()
  confirmAdditional?: boolean;
}
