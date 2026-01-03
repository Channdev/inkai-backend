import { Controller, Get, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/types/api-response.type';

@Controller('v1/activity')
@UseGuards(AuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async getActivity(@CurrentUser() user: { id: string }): Promise<ApiResponse> {
    const data = await this.activityService.getActivity(user.id);
    return { success: true, data };
  }
}
