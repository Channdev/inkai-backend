import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'];

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenException('Admin privileges required');
    }

    const sessionId = request.params.sessionId;
    if (!sessionId) {
      throw new UnauthorizedException('Admin session required');
    }

    const supabase = this.supabaseService.getClient();

    const { data: adminSession, error } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !adminSession) {
      throw new UnauthorizedException('Invalid or expired admin session');
    }

    request['adminSession'] = adminSession;

    return true;
  }
}
