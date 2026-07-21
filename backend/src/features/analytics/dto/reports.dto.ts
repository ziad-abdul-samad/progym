import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const reportMetrics = [
  'members',
  'subscriptions',
  'revenue',
  'attendance',
  'coaches',
  'registrations',
] as const;

export type ReportMetric = (typeof reportMetrics)[number];

export class ReportQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams): string[] =>
    Array.isArray(value)
      ? value.map((item: unknown) => String(item))
      : (typeof value === 'string' ? value : '').split(',').filter(Boolean),
  )
  @IsArray()
  @IsIn(reportMetrics, { each: true })
  metrics?: ReportMetric[];
}

export class UpdateReportSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  monthlySubscriptionPriceMinor!: number;
}
