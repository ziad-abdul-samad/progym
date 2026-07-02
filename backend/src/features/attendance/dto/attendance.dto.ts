import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAttendanceQrDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  expiresInMinutes = 30;
}

export class ScanAttendanceDto {
  @IsString()
  token!: string;
}

export class ManualAttendanceDto {
  @IsString()
  memberId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VoidAttendanceDto {
  @IsString()
  reason!: string;
}
