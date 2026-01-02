import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsDate,
  IsNumber,
  IsArray,
  IsEnum,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SkillCategory, ProficiencyLevel } from '../enums';

export class AddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  street?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}

export class PersonalInfoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  phone!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedIn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;
}

export class WorkExperienceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  company!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  role!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsBoolean()
  current!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  achievements?: string[];
}

export class EducationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  institution!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  degree!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  field!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  achievements?: string[];
}

export class SkillDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(SkillCategory)
  category!: SkillCategory;

  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiencyLevel?: ProficiencyLevel;
}


// Update DTOs with optional fields for partial updates
export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  street?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}

export class UpdateWorkExperienceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  company?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  role?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  current?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  achievements?: string[];
}

export class UpdateEducationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  institution?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  degree?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  field?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  achievements?: string[];
}

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;

  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiencyLevel?: ProficiencyLevel;
}
