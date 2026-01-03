import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { countWords } from '../common/utils/helpers.util';
import { API_CONSTANTS } from '../common/constants/api.constants';

@Injectable()
export class ReportsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(
    userId: string,
    options: {
      projectId?: string;
      status?: string;
      reportType?: string;
      isFavorite?: string;
      includeArchived?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const supabase = this.supabaseService.getClient();
    const limit = options.limit || API_CONSTANTS.DEFAULT_PAGINATION_LIMIT;
    const offset = options.offset || API_CONSTANTS.DEFAULT_PAGINATION_OFFSET;

    let query = supabase
      .from('reports')
      .select('*, projects(name, color)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!options.includeArchived) {
      query = query.eq('is_archived', false);
    }

    if (options.projectId) {
      query = query.eq('project_id', options.projectId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.reportType) {
      query = query.eq('report_type', options.reportType);
    }

    if (options.isFavorite === 'true') {
      query = query.eq('is_favorite', true);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestException('Failed to fetch reports');
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

  async create(userId: string, dto: CreateReportDto) {
    const supabase = this.supabaseService.getClient();

    const wordCount = dto.content ? countWords(dto.content) : 0;

    const { data, error } = await supabase
      .from('reports')
      .insert({
        user_id: userId,
        title: dto.title.trim(),
        content: dto.content || null,
        content_html: dto.content_html || null,
        summary: dto.summary || null,
        word_count: wordCount,
        project_id: dto.project_id || null,
        template_id: dto.template_id || null,
        report_type: dto.report_type || 'general',
        input_data: dto.input_data || null,
        ai_model: dto.ai_model || 'gpt-4',
        tokens_used: dto.tokens_used || 0,
        generation_time_ms: dto.generation_time_ms || null,
        status: dto.content ? 'completed' : 'draft',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create report');
    }

    if (dto.template_id) {
      await supabase.rpc('increment_template_usage', { p_template_id: dto.template_id });
    }

    return data;
  }

  async update(userId: string, dto: UpdateReportDto) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('id', dto.id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      throw new NotFoundException('Report not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.content !== undefined) {
      updateData.content = dto.content;
      updateData.word_count = dto.content ? countWords(dto.content) : 0;
    }
    if (dto.content_html !== undefined) updateData.content_html = dto.content_html;
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.project_id !== undefined) updateData.project_id = dto.project_id;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.is_favorite !== undefined) updateData.is_favorite = dto.is_favorite;
    if (dto.is_archived !== undefined) updateData.is_archived = dto.is_archived;

    const { data, error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', dto.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update report');
    }

    return data;
  }

  async delete(userId: string, id: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.from('reports').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      throw new BadRequestException('Failed to delete report');
    }

    return { message: 'Report deleted successfully' };
  }
}
