import { Controller, Get, Post, Patch, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/types/api-response.type';

@Controller('v1/projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: { id: string },
    @Query('includeArchived') includeArchived: string,
  ): Promise<ApiResponse> {
    const data = await this.projectsService.findAll(user.id, includeArchived === 'true');
    return { success: true, data };
  }

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProjectDto,
  ): Promise<ApiResponse> {
    const data = await this.projectsService.create(user.id, dto);
    return { success: true, data };
  }

  @Patch()
  async update(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProjectDto,
  ): Promise<ApiResponse> {
    const data = await this.projectsService.update(user.id, dto);
    return { success: true, data };
  }

  @Delete()
  async delete(
    @CurrentUser() user: { id: string },
    @Query('id') id: string,
  ): Promise<ApiResponse> {
    if (!id) {
      return { success: false, error: 'Project ID is required' };
    }
    const data = await this.projectsService.delete(user.id, id);
    return { success: true, ...data };
  }
}
