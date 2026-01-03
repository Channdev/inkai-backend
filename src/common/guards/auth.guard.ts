import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionToken = this.extractToken(request);

    if (!sessionToken) {
      throw new UnauthorizedException('No session found');
    }

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

    request['session'] = session;
    request['user'] = session.users;

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return undefined;

    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return cookies['session_token'];
  }
}
