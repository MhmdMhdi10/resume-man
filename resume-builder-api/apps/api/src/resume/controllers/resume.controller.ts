import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ResumeService, PaginationDto } from '../services/resume.service';
import { ProfileService } from '../../profile/services/profile.service';
import { ResumeOptionsDto, SaveResumeDto } from '@app/shared/dto/resume.dto';
import { JwtAuthGuard, CurrentUser } from '../../auth';

interface GenerateResumeDto extends ResumeOptionsDto {
  name: string;
}

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly profileService: ProfileService,
  ) {}

  @Post('generate')
  async generateResume(
    @CurrentUser('userId') userId: string,
    @Body() dto: GenerateResumeDto,
  ) {
    const profile = await this.profileService.getProfile(userId);
    
    const savedResume = await this.resumeService.generateAndSave({
      userId,
      profile,
      options: {
        templateId: dto.templateId,
        includeSections: dto.includeSections,
        selectedExperiences: dto.selectedExperiences,
        selectedEducation: dto.selectedEducation,
        selectedSkills: dto.selectedSkills,
      },
      name: dto.name,
    });

    return {
      success: true,
      data: savedResume,
    };
  }

  @Post('preview')
  async previewResume(
    @CurrentUser('userId') userId: string,
    @Body() dto: ResumeOptionsDto,
    @Res() res: Response,
  ) {
    const profile = await this.profileService.getProfile(userId);
    
    const generated = await this.resumeService.generateResume(profile, {
      templateId: dto.templateId,
      includeSections: dto.includeSections,
      selectedExperiences: dto.selectedExperiences,
      selectedEducation: dto.selectedEducation,
      selectedSkills: dto.selectedSkills,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview.pdf"',
      'Content-Length': generated.pdfBuffer.length,
    });

    res.status(HttpStatus.OK).send(generated.pdfBuffer);
  }

  @Get()
  async getResumes(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination: PaginationDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };

    const result = await this.resumeService.getResumes(userId, pagination);

    return {
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('templates')
  async getTemplates() {
    const templates = this.resumeService.getTemplates();

    return {
      success: true,
      data: templates,
    };
  }

  @Get(':id')
  async getResume(
    @CurrentUser('userId') userId: string,
    @Param('id') resumeId: string,
  ) {
    const resume = await this.resumeService.getResume(userId, resumeId);

    return {
      success: true,
      data: resume,
    };
  }

  @Get(':id/download')
  async downloadResume(
    @CurrentUser('userId') userId: string,
    @Param('id') resumeId: string,
    @Res() res: Response,
  ) {
    const resume = await this.resumeService.getResume(userId, resumeId);
    const fileBuffer = await this.resumeService.getResumeFile(userId, resumeId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${resume.name}.pdf"`,
      'Content-Length': fileBuffer.length,
    });

    res.status(HttpStatus.OK).send(fileBuffer);
  }

  @Delete(':id')
  async deleteResume(
    @CurrentUser('userId') userId: string,
    @Param('id') resumeId: string,
  ) {
    await this.resumeService.deleteResume(userId, resumeId);

    return {
      success: true,
      message: 'Resume deleted successfully',
    };
  }
}
