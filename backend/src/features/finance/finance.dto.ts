import { Type } from 'class-transformer';
import {
  IsIn,
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
