import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateOrgProjectDto } from './dto/create-org-project.dto';
import { generateSlug } from '../common/utils/helpers.util';

@Injectable()
export class OrganizationsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId);

    if (memberError) {
      throw new BadRequestException('Failed to fetch memberships');
    }

    if (!memberships || memberships.length === 0) {
      return { organizations: [] };
    }

    const orgIds = memberships.map((m) => m.organization_id);

    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds)
      .order('created_at', { ascending: true });

    if (orgError) {
      throw new BadRequestException('Failed to fetch organizations');
    }

    return { organizations: organizations || [] };
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    const supabase = this.supabaseService.getClient();
    let slug = generateSlug(dto.name);

    const { data: existingSlug } = await supabase
      .from('organizations')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: dto.name.trim(),
        slug,
        owner_id: userId,
        plan: dto.plan || 'free',
      })
      .select()
      .single();

    if (orgError) {
      throw new BadRequestException('Failed to create organization: ' + orgError.message);
    }

    const { error: memberError } = await supabase.from('organization_members').insert({
      organization_id: organization.id,
      user_id: userId,
      role: 'owner',
    });

    if (memberError) {
      await supabase.from('organizations').delete().eq('id', organization.id);
      throw new BadRequestException('Failed to add member: ' + memberError.message);
    }

    return { organization };
  }

  async getMembers(userId: string, orgId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    const { data: members, error } = await supabase
      .from('organization_members')
      .select(
        `
        id,
        organization_id,
        user_id,
        role,
        created_at,
        users (
          id,
          email,
          full_name,
          avatar_url
        )
      `,
      )
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException('Failed to fetch members');
    }

    return { members: members || [] };
  }

  async addMember(userId: string, orgId: string, dto: AddMemberDto) {
    const supabase = this.supabaseService.getClient();

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('Only owners and admins can invite members');
    }

    const { data: userToAdd } = await supabase
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (!userToAdd) {
      throw new NotFoundException('User not found');
    }

    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', userToAdd.id)
      .single();

    if (existingMember) {
      throw new BadRequestException('User is already a member');
    }

    const { data: newMember, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: userToAdd.id,
        role: dto.role === 'admin' ? 'admin' : 'member',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to add member');
    }

    return { member: newMember };
  }

  async getProjects(userId: string, orgId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    const { data: projects, error } = await supabase
      .from('organization_projects')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Failed to fetch projects');
    }

    return { projects: projects || [] };
  }

  async createProject(userId: string, orgId: string, dto: CreateOrgProjectDto) {
    const supabase = this.supabaseService.getClient();

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('Only owners and admins can create projects');
    }

    const { data: project, error } = await supabase
      .from('organization_projects')
      .insert({
        organization_id: orgId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        region: dto.region || null,
        provider: dto.provider || null,
        created_by: userId,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create project');
    }

    return { project };
  }

  async getPlans() {
    const supabase = this.supabaseService.getClient();

    const { data: plans, error } = await supabase
      .from('organization_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new BadRequestException('Failed to fetch organization plans');
    }

    return { plans: plans || [] };
  }

  async getTypes() {
    const supabase = this.supabaseService.getClient();

    const { data: types, error } = await supabase
      .from('organization_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new BadRequestException('Failed to fetch organization types');
    }

    return { types: types || [] };
  }
}
