import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { generateSessionToken, hashPassword, verifyPassword } from '../common/utils/helpers.util';
import { API_CONSTANTS } from '../common/constants/api.constants';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  async login(dto: LoginDto, ipAddress: string | null, userAgent: string | null) {
    const supabase = this.supabaseService.getClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', dto.email)
      .single();

    if (userError || !user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValidPassword = await verifyPassword(
      dto.password,
      user.password_hash,
      this.supabaseService.getServiceKey(),
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.is_active === false) {
      throw new ForbiddenException('Account is deactivated');
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + API_CONSTANTS.SESSION_DURATION_MS);

    const { error: sessionError } = await supabase.from('sessions').insert({
      user_id: user.id,
      token: sessionToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      throw new BadRequestException('Failed to create session');
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    let defaultOrgSlug = null;
    if (orgMembership) {
      const { data: org } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', orgMembership.organization_id)
        .single();
      defaultOrgSlug = org?.slug;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      subscription: subscription || null,
      session: {
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
      },
      defaultOrgSlug,
    };
  }

  async register(dto: RegisterDto, ipAddress: string | null, userAgent: string | null) {
    const supabase = this.supabaseService.getClient();

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const userId = randomUUID();
    const hashedPassword = await hashPassword(dto.password, this.supabaseService.getServiceKey());

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: dto.email,
        full_name: dto.fullName || null,
        password_hash: hashedPassword,
        role: 'user',
      })
      .select()
      .single();

    if (userError) {
      throw new BadRequestException('Failed to create user: ' + userError.message);
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + API_CONSTANTS.SESSION_DURATION_MS);

    const { error: sessionError } = await supabase.from('sessions').insert({
      user_id: user.id,
      token: sessionToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      throw new BadRequestException('Failed to create session: ' + sessionError.message);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      session: {
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
      },
      redirectTo: '/dashboard/org/new',
    };
  }

  async logout(sessionToken: string) {
    const supabase = this.supabaseService.getClient();
    await supabase.from('sessions').delete().eq('token', sessionToken);
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    const subscription = subData && subData.length > 0 ? subData[0] : null;

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        is_active: user.is_active,
        created_at: user.created_at,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            price_amount: subscription.price_amount,
            currency: subscription.currency,
            current_period_end: subscription.current_period_end,
            tokens_used: subscription.tokens_used || 0,
            tokens_limit: subscription.tokens_limit || API_CONSTANTS.DEFAULT_TOKENS_LIMIT,
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const supabase = this.supabaseService.getClient();

    const updateData: Record<string, string> = {};
    if (dto.fullName !== undefined) updateData.full_name = dto.fullName;
    if (dto.avatarUrl !== undefined) updateData.avatar_url = dto.avatarUrl;

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update profile');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    };
  }

  async getSession(sessionToken: string) {
    const supabase = this.supabaseService.getClient();

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*, users(*)')
      .eq('token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const user = session.users;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      subscription: subscription || null,
      session: {
        expires_at: session.expires_at,
      },
    };
  }

  async changePassword(userId: string, userEmail: string, dto: ChangePasswordDto) {
    const supabase = this.supabaseService.getClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: dto.currentPassword,
    });

    if (signInError) {
      throw new BadRequestException('Current password is incorrect');
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: dto.newPassword,
    });

    if (updateError) {
      throw new BadRequestException('Failed to update password');
    }

    return { message: 'Password changed successfully' };
  }
}
