import { Controller, Get, Post, Patch, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/types/api-response.type';

@Controller('v1/templates')
@UseGuards(AuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: { id: string },
    @Query('category') category: string,
    @Query('includePublic') includePublic: string,
  ): Promise<ApiResponse> {
    const data = await this.templatesService.findAll(user.id, {
      category,
      includePublic: includePublic === 'true',
    });
    return { success: true, data };
  }

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTemplateDto,
  ): Promise<ApiResponse> {
    const data = await this.templatesService.create(user.id, dto);
    return { success: true, data };
  }

  @Patch()
  async update(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTemplateDto,
  ): Promise<ApiResponse> {
    const data = await this.templatesService.update(user.id, dto);
    return { success: true, data };
  }

  @Delete()
  async delete(
    @CurrentUser() user: { id: string },
    @Query('id') id: string,
  ): Promise<ApiResponse> {
    if (!id) {
      return { success: false, error: 'Template ID is required' };
    }
    const data = await this.templatesService.delete(user.id, id);
    return { success: true, ...data };
  }
}
