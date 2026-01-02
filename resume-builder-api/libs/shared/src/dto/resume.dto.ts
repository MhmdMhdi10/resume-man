import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SectionSelectionDto {
  @IsBoolean()
  personalInfo!: boolean;

  @IsBoolean()
  summary!: boolean;

  @IsBoolean()
  workExperience!: boolean;

  @IsBoolean()
  education!: boolean;

  @IsBoolean()
  skills!: boolean;
}

export class ResumeOptionsDto {
  @IsString()
  @MinLength(1)
  templateId!: string;

  @ValidateNested()
  @Type(() => SectionSelectionDto)
  includeSections!: SectionSelectionDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedExperiences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedEducation?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedSkills?: string[];
}

export class SaveResumeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
