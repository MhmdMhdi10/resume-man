import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AiService, ExtractedSkill } from '../services/ai.service';
import { ProfileService } from '../../profile/services/profile.service';
import { SettingsService } from '../../settings/services/settings.service';
import { JwtAuthGuard, CurrentUser } from '../../auth';

interface ImproveDescriptionDto {
  experienceId: string;
  description: string;
  role: string;
  company: string;
}

interface ImproveAllDescriptionsDto {
  experiences: Array<{
    id: string;
    role: string;
    company: string;
    description: string;
  }>;
  customPrompt?: string;
}

interface ExtractSkillsDto {
  customPrompt?: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly profileService: ProfileService,
    private readonly settingsService: SettingsService,
  ) {}

  @Post('improve-description')
  @HttpCode(HttpStatus.OK)
  async improveDescription(
    @CurrentUser('userId') userId: string,
    @Body() dto: ImproveDescriptionDto,
  ) {
    const model = await this.settingsService.getPreferredAiModel(userId);
    const improved = await this.aiService.improveDescription(
      dto.description,
      dto.role,
      dto.company,
      model,
    );

    return {
      success: true,
      data: {
        experienceId: dto.experienceId,
        original: dto.description,
        improved,
      },
    };
  }

  @Post('improve-all-descriptions')
  @HttpCode(HttpStatus.OK)
  async improveAllDescriptions(
    @CurrentUser('userId') userId: string,
    @Body() dto: ImproveAllDescriptionsDto,
  ) {
    const model = await this.settingsService.getPreferredAiModel(userId);
    const results = await this.aiService.improveAllDescriptions(dto.experiences, model, dto.customPrompt);

    return {
      success: true,
      data: results,
    };
  }

  @Post('extract-skills')
  @HttpCode(HttpStatus.OK)
  async extractSkills(
    @CurrentUser('userId') userId: string,
    @Body() dto: ExtractSkillsDto,
  ) {
    const profile = await this.profileService.getProfile(userId);
    
    if (!profile.workExperience || profile.workExperience.length === 0) {
      return {
        success: true,
        data: [],
        message: 'No work experience found to extract skills from',
      };
    }

    const experiences = profile.workExperience.map(exp => ({
      role: exp.role,
      company: exp.company,
      description: exp.description || '',
      achievements: exp.achievements,
    }));

    const model = await this.settingsService.getPreferredAiModel(userId);
    const skills = await this.aiService.extractSkillsFromExperiences(experiences, model, dto.customPrompt);

    return {
      success: true,
      data: skills,
    };
  }

  @Post('extract-skills-and-save')
  @HttpCode(HttpStatus.OK)
  async extractSkillsAndSave(
    @CurrentUser('userId') userId: string,
    @Body() dto: ExtractSkillsDto,
  ) {
    const profile = await this.profileService.getProfile(userId);
    
    if (!profile.workExperience || profile.workExperience.length === 0) {
      return {
        success: true,
        data: { added: 0, skills: [] },
        message: 'No work experience found to extract skills from',
      };
    }

    const experiences = profile.workExperience.map(exp => ({
      role: exp.role,
      company: exp.company,
      description: exp.description || '',
      achievements: exp.achievements,
    }));

    const model = await this.settingsService.getPreferredAiModel(userId);
    const extractedSkills = await this.aiService.extractSkillsFromExperiences(experiences, model, dto.customPrompt);

    const existingSkillNames = new Set(
      (profile.skills || []).map(s => s.name.toLowerCase())
    );

    const newSkills: ExtractedSkill[] = [];
    for (const skill of extractedSkills) {
      if (!existingSkillNames.has(skill.name.toLowerCase())) {
        try {
          await this.profileService.addSkill(userId, {
            name: skill.name,
            category: skill.category as any,
            proficiencyLevel: skill.proficiencyLevel as any,
          });
          newSkills.push(skill);
          existingSkillNames.add(skill.name.toLowerCase());
        } catch (error) {
          // Skip if skill couldn't be added
        }
      }
    }

    return {
      success: true,
      data: {
        added: newSkills.length,
        skills: newSkills,
      },
    };
  }
}
