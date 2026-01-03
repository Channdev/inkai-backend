import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateOrgProjectDto } from './dto/create-org-project.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/types/api-response.type';

@Controller('v1/organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@CurrentUser() user: { id: string }): Promise<ApiResponse> {
    const data = await this.organizationsService.findAll(user.id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateOrganizationDto,
  ): Promise<ApiResponse> {
    const data = await this.organizationsService.create(user.id, dto);
    return { success: true, data };
  }

  @Get('plans')
  async getPlans(): Promise<ApiResponse> {
    const data = await this.organizationsService.getPlans();
    return { success: true, data };
  }

  @Get('types')
  async getTypes(): Promise<ApiResponse> {
    const data = await this.organizationsService.getTypes();
    return { success: true, data };
  }

  @Get(':orgId/members')
  @UseGuards(AuthGuard)
  async getMembers(
    @CurrentUser() user: { id: string },
    @Param('orgId') orgId: string,
  ): Promise<ApiResponse> {
    const data = await this.organizationsService.getMembers(user.id, orgId);
    return { success: true, data };
  }

  @Post(':orgId/members')
  @UseGuards(AuthGuard)
  async addMember(
    @CurrentUser() user: { id: string },
    @Param('orgId') orgId: string,
    @Body() dto: AddMemberDto,
  ): Promise<ApiResponse> {
    const data = await this.organizationsService.addMember(user.id, orgId, dto);
    return { success: true, data };
  }

  @Get(':orgId/projects')
  @UseGuards(AuthGuard)
  async getProjects(
    @CurrentUser() user: { id: string },
    @Param('orgId') orgId: string,
  ): Promise<ApiResponse> {
    const data = await this.organizationsService.getProjects(user.id, orgId);
    return { success: true, data };
  }

  @Post(':orgId/projects')
  @UseGuards(AuthGuard)
  async createProject(
    @CurrentUser() user: { id: string },
    @Param('orgId') orgId: string,
    @Body() dto: CreateOrgProjectDto,
  ): Promise<ApiResponse> {
    const data = await this.organizationsService.createProject(user.id, orgId, dto);
    return { success: true, data };
  }
}
