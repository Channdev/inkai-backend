import { Controller, Get, Post, Patch, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { CreateExportDto } from './dto/create-export.dto';
import { UpdateExportDto } from './dto/update-export.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginatedResponse } from '../common/types/api-response.type';

@Controller('v1/exports')
@UseGuards(AuthGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: { id: string },
    @Query('reportId') reportId: string,
    @Query('fileType') fileType: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ): Promise<PaginatedResponse<unknown>> {
    const result = await this.exportsService.findAll(user.id, {
      reportId,
      fileType,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreateExportDto) {
    const data = await this.exportsService.create(user.id, dto);
    return { success: true, data };
  }

  @Patch()
  async update(@CurrentUser() user: { id: string }, @Body() dto: UpdateExportDto) {
    const data = await this.exportsService.update(user.id, dto);
    return { success: true, data };
  }

  @Delete()
  async delete(@CurrentUser() user: { id: string }, @Query('id') id: string) {
    if (!id) {
      return { success: false, error: 'Export ID is required' };
    }
    const data = await this.exportsService.delete(user.id, id);
    return { success: true, ...data };
  }
}
