import { IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsString()
  titleAr!: string;

  @IsString()
  bodyAr!: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;
}
