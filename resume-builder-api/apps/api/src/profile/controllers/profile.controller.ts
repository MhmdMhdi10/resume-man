import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IUserProfile,
  IPersonalInfo,
  IWorkExperience,
  IEducation,
  ISkill,
  PersonalInfoDto,
  WorkExperienceDto,
  EducationDto,
  SkillDto,
  UpdateWorkExperienceDto,
  UpdateEducationDto,
  UpdateSkillDto,
} from '@app/shared';
import { ProfileService } from '../services/profile.service';
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Profile endpoints
  @Get()
  async getProfile(@CurrentUser() user: CurrentUserData): Promise<IUserProfile> {
    return this.profileService.getProfile(user.userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@CurrentUser() user: CurrentUserData): Promise<void> {
    await this.profileService.deleteProfile(user.userId);
  }

  // Personal Info endpoints
  @Get('personal-info')
  async getPersonalInfo(
    @CurrentUser() user: CurrentUserData,
  ): Promise<IPersonalInfo | null> {
    return this.profileService.getPersonalInfo(user.userId);
  }

  @Put('personal-info')
  async updatePersonalInfo(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: PersonalInfoDto,
    @Query('version') version?: string,
  ): Promise<IUserProfile> {
    const expectedVersion = version ? parseInt(version, 10) : undefined;
    return this.profileService.updatePersonalInfo(user.userId, dto, expectedVersion);
  }


  // Work Experience endpoints
  @Get('work-experience')
  async getWorkExperience(
    @CurrentUser() user: CurrentUserData,
  ): Promise<IWorkExperience[]> {
    return this.profileService.getWorkExperience(user.userId);
  }

  @Post('work-experience')
  @HttpCode(HttpStatus.CREATED)
  async addWorkExperience(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: WorkExperienceDto,
    @Query('version') version?: string,
  ): Promise<IUserProfile> {
    const expectedVersion = version ? parseInt(version, 10) : undefined;
    return this.profileService.addWorkExperience(user.userId, dto, expectedVersion);
  }

  @Put('work-experience/:id')
  async updateWorkExperience(
    @CurrentUser() user: CurrentUserData,
    @Param('id') experienceId: string,
    @Body() dto: UpdateWorkExperienceDto,
    @Query('version') version?: string,
  ): Promise<IUserProfile> {
    const expectedVersion = version ? parseInt(version, 10) : undefined;
    return this.profileService.updateWorkExperience(
      user.userId,
      experienceId,
      dto,
      expectedVersion,
    );
  }

  @Delete('work-experience/:id')
  @HttpCode(HttpStatus.OK)
  async deleteWorkExperience(
    @CurrentUser() user: CurrentUserData,
    @Param('id') experienceId: string,
    @Query('version') version?: string,
  ): Promise<IUserProfile> {
    const expectedVersion = version ? parseInt(version, 10) : undefined;
    return this.profileService.deleteWorkExperience(
      user.userId,
      experienceId,
      expectedVersion,
    );
  }

  // Education endpoints
  @Get('education')
  async getEducation(
    @CurrentUser() user: CurrentUserData,
  ): Promise<IEducation[]> {
    return this.profileService.getEducation(user.userId);
  }

  @Post('education')
  @HttpCode(HttpStatus.CREATED)
  async addEducation(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: EducationDto,
    @Query('version') version?: string,
  ): Promise<IUserProfile> {
    const expectedVersion = version ? parseInt(version, 10) : undefined;
    return this.profileService.addEducation(user.userId, dto, expectedVersion);
  }

  @Put('education/:id')
  async updateEducation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') educationId: string,
    @Body() dto: UpdateEducationDto,
    @Query('version') version?: string,
  ): Promise<IUserProfile> {
    const expectedVersion = version ? parseInt(version, 10) : undefined;
    return this.profileService.updateEducation(
      user.userId,
      educationId,
      dto,
      expectedVersion,
    );
  }

  @Delete('education/:id')
  @HttpCode(HttpStatus.OK)
  async deleteEducation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') educationId: string,
    @Query('version') version?: string,
  ): Promise<IUserProfile> {
    const expectedVersion = version ? parseInt(version, 10) : undefined;
    return this.profileService.deleteEducation(
      user.userId,
      educationId,
      expectedVersion,
    );
  }


  // Skills endpoints
  @Get('skills')
  async getSkills(@CurrentUser() user: CurrentUserData): Promise<ISkill[]> {
    return this.profileService.getSkills(user.userId);
  }

  @Get('skills/category/:category')
  async getSkillsByCategory(
    @CurrentUser() user: CurrentUserData,
    @Param('category') category: string,
  ): Promise<ISkill[]> {
    return this.profileService.getSkillsByCategory(user.userId, category);
  }

  @Post('skills')
  @HttpCode(HttpStatus.CREATED)
  async addSkill(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SkillDto,
    @Query('version') version?: string,
  ): Promise<IUserProfile> {
    const expectedVersion = version ? parseInt(version, 10) : undefined;
    return this.profileService.addSkill(user.userId, dto, expectedVersion);
  }

  @Put('skills/:id')
  async updateSkill(
    @CurrentUser() user: CurrentUserData,
    @Param('id') skillId: string,
    @Body() dto: UpdateSkillDto,
    @Query('version') version?: string,
  ): Promise<IUserProfile> {
    const expectedVersion = version ? parseInt(version, 10) : undefined;
    return this.profileService.updateSkill(user.userId, skillId, dto, expectedVersion);
  }

  @Delete('skills/:id')
  @HttpCode(HttpStatus.OK)
  async deleteSkill(
    @CurrentUser() user: CurrentUserData,
    @Param('id') skillId: string,
    @Query('version') version?: string,
  ): Promise<IUserProfile> {
    const expectedVersion = version ? parseInt(version, 10) : undefined;
    return this.profileService.deleteSkill(user.userId, skillId, expectedVersion);
  }

  // Version history endpoint
  @Get('versions')
  async getVersionHistory(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.profileService.getVersionHistory(user.userId, limitNum);
  }
}
