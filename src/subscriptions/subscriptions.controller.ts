import { Controller, Get, Post, Body, Req, Res, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { TrialDto } from './dto/trial.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/types/api-response.type';

@Controller('v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@CurrentUser() user: { id: string }): Promise<ApiResponse> {
    const data = await this.subscriptionsService.findAll(user.id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSubscriptionDto,
  ): Promise<ApiResponse> {
    const data = await this.subscriptionsService.create(user.id, dto);
    return { success: true, data };
  }

  @Post('trial')
  @HttpCode(HttpStatus.OK)
  async activateTrial(
    @Body() dto: TrialDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || null;
    const userAgent = req.headers['user-agent'] || null;

    const data = await this.subscriptionsService.activateTrial(dto, ipAddress, userAgent);

    res.cookie('session_token', data.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(data.session.expires_at),
      path: '/',
    });

    return { success: true, data };
  }
}
