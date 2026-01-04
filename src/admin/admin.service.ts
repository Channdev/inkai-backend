import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as crypto from 'crypto';

const ADMIN_SESSION_DURATION_MS = 4 * 60 * 60 * 1000;

@Injectable()
export class AdminService {
  constructor(private supabaseService: SupabaseService) {}

  async createSession(userId: string, userRole: string, ipAddress: string | null, userAgent: string | null) {
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      throw new ForbiddenException('Admin privileges required');
    }

    const supabase = this.supabaseService.getClient();

    await supabase
      .from('admin_sessions')
      .delete()
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString());

    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS);

    const { error: sessionError } = await supabase.from('admin_sessions').insert({
      session_id: sessionId,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      throw new BadRequestException('Failed to create admin session');
    }

    await supabase.from('admin_activity_logs').insert({
      user_id: userId,
      action: 'admin_session_created',
      details: { ip_address: ipAddress, user_agent: userAgent },
    });

    return {
      sessionId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async validateSession(sessionId: string, userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: session, error } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return { valid: false };
    }

    return {
      valid: true,
      expiresAt: session.expires_at,
    };
  }

  async endSession(sessionId: string, userId: string) {
    const supabase = this.supabaseService.getClient();

    await supabase
      .from('admin_sessions')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    await supabase.from('admin_activity_logs').insert({
      user_id: userId,
      action: 'admin_session_ended',
      details: {},
    });

    return { message: 'Admin session ended' };
  }

  async getDashboardStats() {
    const supabase = this.supabaseService.getClient();

    const [usersResult, orgsResult, subsResult, paymentsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('payments').select('amount').eq('status', 'completed'),
    ]);

    const totalRevenue = paymentsResult.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newUsersCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo);

    return {
      totalUsers: usersResult.count || 0,
      totalOrganizations: orgsResult.count || 0,
      activeSubscriptions: subsResult.count || 0,
      totalRevenue,
      newUsersLast30Days: newUsersCount || 0,
    };
  }

  async getUsers(page: number = 1, limit: number = 20, search?: string) {
    const supabase = this.supabaseService.getClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, full_name, role, is_active, avatar_url, created_at, oauth_provider', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException('Failed to fetch users');
    }

    return {
      users: data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async getOrganizations(page: number = 1, limit: number = 20, search?: string) {
    const supabase = this.supabaseService.getClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('organizations')
      .select('id, name, slug, plan_id, owner_id, created_at, users!organizations_owner_id_fkey(email, full_name)', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException('Failed to fetch organizations');
    }

    return {
      organizations: data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async getSubscriptions(page: number = 1, limit: number = 20) {
    const supabase = this.supabaseService.getClient();
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from('subscriptions')
      .select('*, users(email, full_name), organizations(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException('Failed to fetch subscriptions');
    }

    return {
      subscriptions: data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async getPayments(page: number = 1, limit: number = 20) {
    const supabase = this.supabaseService.getClient();
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from('payments')
      .select('*, users(email, full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException('Failed to fetch payments');
    }

    return {
      payments: data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async getActivityLogs(page: number = 1, limit: number = 50) {
    const supabase = this.supabaseService.getClient();
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from('admin_activity_logs')
      .select('*, users(email, full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException('Failed to fetch activity logs');
    }

    return {
      logs: data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async updateUserStatus(userId: string, isActive: boolean, adminUserId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (error) {
      throw new BadRequestException('Failed to update user status');
    }

    await supabase.from('admin_activity_logs').insert({
      user_id: adminUserId,
      action: isActive ? 'user_activated' : 'user_deactivated',
      details: { target_user_id: userId },
    });

    return { success: true };
  }

  async updateUserRole(userId: string, role: string, adminUserId: string) {
    const supabase = this.supabaseService.getClient();

    const validRoles = ['user', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (error) {
      throw new BadRequestException('Failed to update user role');
    }

    await supabase.from('admin_activity_logs').insert({
      user_id: adminUserId,
      action: 'user_role_updated',
      details: { target_user_id: userId, new_role: role },
    });

    return { success: true };
  }
}
