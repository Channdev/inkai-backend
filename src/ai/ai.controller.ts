import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { IntelDto } from './dto/intel.dto';
import { RefineDto } from './dto/refine.dto';
import { StartDto } from './dto/start.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/types/api-response.type';

@Controller('v1')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('intel')
  async generateIntel(
    @CurrentUser() user: { id: string },
    @Body() dto: IntelDto,
  ): Promise<ApiResponse> {
    const data = await this.aiService.generateIntel(user.id, dto);
    return { success: true, data };
  }

  @Post('refine')
  async refineContent(
    @CurrentUser() user: { id: string },
    @Body() dto: RefineDto,
  ): Promise<ApiResponse> {
    const data = await this.aiService.refineContent(user.id, dto);
    return { success: true, data };
  }

  @Post('start')
  async generateBrief(
    @CurrentUser() user: { id: string },
    @Body() dto: StartDto,
  ): Promise<ApiResponse> {
    const data = await this.aiService.generateBrief(user.id, dto);
    return { success: true, data };
  }
}
