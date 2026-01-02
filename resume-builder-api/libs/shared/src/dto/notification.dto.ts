import { IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationPreferencesDto {
  @IsBoolean()
  emailEnabled!: boolean;

  @IsBoolean()
  inAppEnabled!: boolean;

  @IsBoolean()
  applicationUpdates!: boolean;

  @IsBoolean()
  batchSummaries!: boolean;
}

export class PaginationDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;
}
