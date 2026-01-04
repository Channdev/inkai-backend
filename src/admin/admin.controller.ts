import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ApiResponse } from '../common/types/api-response.type';

@Controller('v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('session')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createSession(@Req() req: Request): Promise<ApiResponse> {
    const user = req['user'];
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || null;
    const userAgent = req.headers['user-agent'] || null;

    const data = await this.adminService.createSession(user.id, user.role, ipAddress, userAgent);
    return { success: true, data };
  }

  @Get('session/:sessionId/validate')
  @UseGuards(AuthGuard)
  async validateSession(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
  ): Promise<ApiResponse> {
    const user = req['user'];
    const data = await this.adminService.validateSession(sessionId, user.id);
    return { success: true, data };
  }

  @Delete('session/:sessionId')
  @UseGuards(AuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async endSession(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
  ): Promise<ApiResponse> {
    const user = req['user'];
    const data = await this.adminService.endSession(sessionId, user.id);
    return { success: true, data };
  }

  @Get('session/:sessionId/stats')
  @UseGuards(AuthGuard, AdminGuard)
  async getDashboardStats(): Promise<ApiResponse> {
    const data = await this.adminService.getDashboardStats();
    return { success: true, data };
  }

  @Get('session/:sessionId/users')
  @UseGuards(AuthGuard, AdminGuard)
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse> {
    const data = await this.adminService.getUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
    return { success: true, data };
  }

  @Get('session/:sessionId/organizations')
  @UseGuards(AuthGuard, AdminGuard)
  async getOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse> {
    const data = await this.adminService.getOrganizations(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
    return { success: true, data };
  }

  @Get('session/:sessionId/subscriptions')
  @UseGuards(AuthGuard, AdminGuard)
  async getSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse> {
    const data = await this.adminService.getSubscriptions(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return { success: true, data };
  }

  @Get('session/:sessionId/payments')
  @UseGuards(AuthGuard, AdminGuard)
  async getPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse> {
    const data = await this.adminService.getPayments(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return { success: true, data };
  }

  @Get('session/:sessionId/activity-logs')
  @UseGuards(AuthGuard, AdminGuard)
  async getActivityLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse> {
    const data = await this.adminService.getActivityLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
    return { success: true, data };
  }

  @Patch('session/:sessionId/users/:userId/status')
  @UseGuards(AuthGuard, AdminGuard)
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body('isActive') isActive: boolean,
    @Req() req: Request,
  ): Promise<ApiResponse> {
    const adminUser = req['user'];
    const data = await this.adminService.updateUserStatus(userId, isActive, adminUser.id);
    return { success: true, data };
  }

  @Patch('session/:sessionId/users/:userId/role')
  @UseGuards(AuthGuard, AdminGuard)
  async updateUserRole(
    @Param('userId') userId: string,
    @Body('role') role: string,
    @Req() req: Request,
  ): Promise<ApiResponse> {
    const adminUser = req['user'];
    const data = await this.adminService.updateUserRole(userId, role, adminUser.id);
    return { success: true, data };
  }
}
