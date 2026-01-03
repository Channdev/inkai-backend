import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateExportDto } from './dto/create-export.dto';
import { UpdateExportDto } from './dto/update-export.dto';
import { API_CONSTANTS } from '../common/constants/api.constants';

@Injectable()
export class ExportsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(
    userId: string,
    options: {
      reportId?: string;
      fileType?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const supabase = this.supabaseService.getClient();
    const limit = options.limit || API_CONSTANTS.DEFAULT_PAGINATION_LIMIT;
    const offset = options.offset || API_CONSTANTS.DEFAULT_PAGINATION_OFFSET;

    let query = supabase
      .from('export_archives')
      .select('*, reports(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.reportId) {
      query = query.eq('report_id', options.reportId);
    }

    if (options.fileType) {
      query = query.eq('file_type', options.fileType);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestException('Failed to fetch exports');
    }

    return {
      data,
      pagination: {
        limit,
        offset,
        total: count,
      },
    };
  }

  async create(userId: string, dto: CreateExportDto) {
    const supabase = this.supabaseService.getClient();

    if (dto.report_id) {
      const { data: report } = await supabase
        .from('reports')
        .select('id')
        .eq('id', dto.report_id)
        .eq('user_id', userId)
        .single();

      if (!report) {
        throw new NotFoundException('Report not found');
      }
    }

    const { data, error } = await supabase
      .from('export_archives')
      .insert({
        user_id: userId,
        report_id: dto.report_id || null,
        file_name: dto.file_name,
        file_type: dto.file_type,
        file_size: dto.file_size || null,
        file_url: dto.file_url || null,
        storage_path: dto.storage_path || null,
        expires_at: dto.expires_at || null,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create export record');
    }

    return data;
  }

  async update(userId: string, dto: UpdateExportDto) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('export_archives')
      .select('id, download_count')
      .eq('id', dto.id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      throw new NotFoundException('Export not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.increment_download) {
      updateData.download_count = (existing.download_count || 0) + 1;
    }

    const { data, error } = await supabase
      .from('export_archives')
      .update(updateData)
      .eq('id', dto.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update export');
    }

    return data;
  }

  async delete(userId: string, id: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('export_archives')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException('Failed to delete export');
    }

    return { message: 'Export deleted successfully' };
  }
}
