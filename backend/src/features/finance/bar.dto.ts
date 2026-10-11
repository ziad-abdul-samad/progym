import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class BarProductsQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsIn(['ACTIVE', 'ARCHIVED']) status: string = 'ACTIVE';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page: number = 1;
}
export class BarPriceDto {
  @IsString() @MinLength(2) @MaxLength(60) label!: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(2000000000) unitPriceMinor!: number;
}
export class BarProductDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsIn(['USD', 'SYP_NEW']) currency!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BarPriceDto)
  prices!: BarPriceDto[];
  @IsBoolean() isActive: boolean = true;
}
export class UpdateBarProductDto extends BarProductDto {
  @IsDateString() expectedUpdatedAt!: string;
}
export class BarSaleDto {
  @IsString() @MinLength(1) @MaxLength(120) productId!: string;
  @IsDateString() expectedUpdatedAt!: string;
  @IsString() @MinLength(2) @MaxLength(60) priceLabel!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) quantity!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(2000000000) unitPriceMinor!: number;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) soldOn!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsString() @MinLength(16) @MaxLength(120) requestKey!: string;
}
export class BarCashDto {
  @IsIn(['EXPENSE', 'OPENING']) kind!: string;
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(2000000000) amountMinor!: number;
  @IsIn(['USD', 'SYP_NEW']) currency!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) spentOn!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsString() @MinLength(16) @MaxLength(120) requestKey!: string;
}
