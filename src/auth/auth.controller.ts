import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/types/api-response.type';

const isProduction = process.env.NODE_ENV === 'production';

const getCookieOptions = (expires: Date): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: isProduction ? 'none' : 'lax',
  expires,
  path: '/',
});

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || null;
    const userAgent = req.headers['user-agent'] || null;

    const data = await this.authService.login(dto, ipAddress, userAgent);

    res.cookie('session_token', data.session.token, getCookieOptions(new Date(data.session.expires_at)));
    return { success: true, data };
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || null;
    const userAgent = req.headers['user-agent'] || null;
    const data = await this.authService.register(dto, ipAddress, userAgent);
    res.cookie('session_token', data.session.token, getCookieOptions(new Date(data.session.expires_at)));
    return { success: true, data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const sessionToken = this.extractToken(req);
    if (sessionToken) {
      await this.authService.logout(sessionToken);
    }
    res.cookie('session_token', '', getCookieOptions(new Date(0)));
    return { success: true, data: { message: 'Logged out successfully' } };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: { id: string }): Promise<ApiResponse> {
    const data = await this.authService.getMe(user.id);
    return { success: true, data };
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse> {
    const data = await this.authService.updateProfile(user.id, dto);
    return { success: true, data };
  }

  @Get('session')
  async getSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse> {
    const sessionToken = this.extractToken(req);

    if (!sessionToken) {
      res.status(HttpStatus.UNAUTHORIZED);
      return { success: false, error: 'No session found' };
    }

    try {
      const data = await this.authService.getSession(sessionToken);
      return { success: true, data };
    } catch {
      res.cookie('session_token', '', getCookieOptions(new Date(0)));
      res.status(HttpStatus.UNAUTHORIZED);
      return { success: false, error: 'Invalid or expired session' };
    }
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: { id: string; email: string },
    @Body() dto: ChangePasswordDto,
  ): Promise<ApiResponse> {
    const data = await this.authService.changePassword(user.id, user.email, dto);
    return { success: true, data };
  }

  private extractToken(request: Request): string | undefined {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return undefined;

    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return cookies['session_token'];
  }
}
