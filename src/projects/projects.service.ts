import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(userId: string, includeArchived: boolean) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException('Failed to fetch projects');
    }

    return data;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        color: dto.color || '#6366f1',
        icon: dto.icon || 'folder',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create project');
    }

    return data;
  }

  async update(userId: string, dto: UpdateProjectDto) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('id', dto.id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.is_archived !== undefined) updateData.is_archived = dto.is_archived;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', dto.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update project');
    }

    return data;
  }

  async delete(userId: string, id: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException('Failed to delete project');
    }

    return { message: 'Project deleted successfully' };
  }
}
