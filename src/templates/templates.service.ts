import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(userId: string, options: { category?: string; includePublic?: boolean }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase.from('templates').select('*').order('usage_count', { ascending: false });

    if (options.includePublic) {
      query = query.or(`user_id.eq.${userId},is_public.eq.true`);
    } else {
      query = query.eq('user_id', userId);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException('Failed to fetch templates');
    }

    return data;
  }

  async create(userId: string, dto: CreateTemplateDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: userId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        category: dto.category || 'general',
        content: dto.content,
        prompt_template: dto.prompt_template || null,
        variables: dto.variables || [],
        is_public: dto.is_public || false,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create template');
    }

    return data;
  }

  async update(userId: string, dto: UpdateTemplateDto) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('templates')
      .select('id')
      .eq('id', dto.id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.prompt_template !== undefined) updateData.prompt_template = dto.prompt_template;
    if (dto.variables !== undefined) updateData.variables = dto.variables;
    if (dto.is_public !== undefined) updateData.is_public = dto.is_public;

    const { data, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', dto.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update template');
    }

    return data;
  }

  async delete(userId: string, id: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.from('templates').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      throw new BadRequestException('Failed to delete template');
    }

    return { message: 'Template deleted successfully' };
  }
}
