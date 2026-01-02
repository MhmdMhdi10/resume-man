import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from '../services/settings.service';
import { JwtAuthGuard, CurrentUser } from '../../auth';

interface SetJobinjaCredentialsDto {
  email: string;
  password: string;
}

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('jobinja')
  @HttpCode(HttpStatus.OK)
  async getJobinjaCredentials(@CurrentUser('userId') userId: string) {
    const credentials = await this.settingsService.getJobinjaCredentials(userId);
    return {
      success: true,
      data: credentials,
    };
  }

  @Post('jobinja')
  @HttpCode(HttpStatus.OK)
  async setJobinjaCredentials(
    @CurrentUser('userId') userId: string,
    @Body() dto: SetJobinjaCredentialsDto,
  ) {
    await this.settingsService.setJobinjaCredentials(userId, dto.email, dto.password);
    return {
      success: true,
      message: 'Jobinja credentials saved successfully',
    };
  }

  @Delete('jobinja')
  @HttpCode(HttpStatus.OK)
  async clearJobinjaCredentials(@CurrentUser('userId') userId: string) {
    await this.settingsService.clearJobinjaCredentials(userId);
    return {
      success: true,
      message: 'Jobinja credentials cleared successfully',
    };
  }
}
