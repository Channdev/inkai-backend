import { Controller, Post, Body, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { OAuthService } from './oauth.service';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { ApiResponse } from '../common/types/api-response.type';

@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async callback(
    @Body() dto: OAuthCallbackDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || null;
    const userAgent = req.headers['user-agent'] || null;

    const data = await this.oauthService.handleCallback(dto, ipAddress, userAgent);

    res.cookie('session_token', data.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(data.session.expires_at),
      path: '/',
    });

    return { success: true, redirectTo: data.redirectTo };
  }
}
