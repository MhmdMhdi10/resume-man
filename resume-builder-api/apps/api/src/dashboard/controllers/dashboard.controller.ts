import {
  Controller,
  Get,
  Query,
  Request,
} from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

class TimelineQueryDto {
  days?: number;
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/stats - Get application statistics
   */
  @Get('stats')
  async getApplicationStats(@Request() req: AuthenticatedRequest) {
    return this.dashboardService.getApplicationStats(req.user.userId);
  }

  /**
   * GET /dashboard/timeline - Get application timeline data
   */
  @Get('timeline')
  async getApplicationTimeline(
    @Request() req: AuthenticatedRequest,
    @Query() query: TimelineQueryDto,
  ) {
    const days = query.days ? parseInt(String(query.days), 10) : 30;
    return this.dashboardService.getApplicationTimeline(req.user.userId, days);
  }
}
