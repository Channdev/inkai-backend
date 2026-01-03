import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { generateSessionToken } from '../common/utils/helpers.util';
import { API_CONSTANTS } from '../common/constants/api.constants';

@Injectable()
export class OAuthService {
  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  async handleCallback(dto: OAuthCallbackDto, ipAddress: string | null, userAgent: string | null) {
    const supabaseUrl = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL') ||
      this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new BadRequestException('Missing Supabase configuration');
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${dto.access_token}`,
        },
      },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(dto.access_token);

    if (userError || !userData.user) {
      throw new UnauthorizedException('Invalid token');
    }

    const supabaseUser = userData.user;
    const email = supabaseUser.email;

    if (!email) {
      throw new BadRequestException('No email found');
    }

    const fullName =
      supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null;
    const avatarUrl =
      supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null;
    const providerId = supabaseUser.id;

    const supabase = this.supabaseService.getClient();

    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let userId: string;

    if (findError || !existingUser) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          oauth_provider: 'google',
          oauth_provider_id: providerId,
          is_active: true,
          role: 'user',
        })
        .select()
        .single();

      if (createError || !newUser) {
        throw new BadRequestException('User creation failed');
      }

      userId = newUser.id;
    } else {
      userId = existingUser.id;

      if (!existingUser.oauth_provider) {
        await supabase
          .from('users')
          .update({
            oauth_provider: 'google',
            oauth_provider_id: providerId,
            avatar_url: existingUser.avatar_url || avatarUrl,
          })
          .eq('id', userId);
      }
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + API_CONSTANTS.SESSION_DURATION_MS);

    const { error: sessionError } = await supabase.from('sessions').insert({
      user_id: userId,
      token: sessionToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      throw new BadRequestException('Session creation failed');
    }

    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    let redirectTo = '/dashboard';
    if (orgMembership) {
      const { data: org } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', orgMembership.organization_id)
        .single();

      if (org?.slug) {
        redirectTo = `/dashboard/org/${org.slug}`;
      }
    }

    return {
      redirectTo,
      session: {
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
      },
    };
  }
}
