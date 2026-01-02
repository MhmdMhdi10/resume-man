import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDate,
  IsNumber,
  Min,
  Max,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStatus } from '../enums';

export class BatchApplicationDto {
  @IsString()
  resumeId!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one job must be selected' })
  jobIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverLetter?: string;
}

export class ApplicationFiltersDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;

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
